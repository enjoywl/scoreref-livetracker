/**
 * Direct-to-Wasabi image URLs (SigV4 presigned).
 *
 * The old API image endpoints no longer exist, so there is no API-proxy
 * fallback here: images are fetched straight from the Wasabi bucket.
 *
 * Config resolution order (first hit wins):
 *   1. Full env config: VITE_WASABI_ENDPOINT + VITE_WASABI_BUCKET
 *      (+ optional VITE_WASABI_REGION, derived from endpoint otherwise)
 *   2. Discovery: GET {VITE_API_BASE_URL}/v2/api/config/wasabi/region
 *
 * Always required: VITE_WASABI_ACCESS_KEY / VITE_WASABI_SECRET_KEY.
 * Call initWasabi() once on the client before rendering images.
 */
import { presignGetUrl } from './sigv4'

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? ''
const ACCESS_KEY: string = import.meta.env.VITE_WASABI_ACCESS_KEY ?? ''
const SECRET_KEY: string = import.meta.env.VITE_WASABI_SECRET_KEY ?? ''
const ENV_BUCKET: string = import.meta.env.VITE_WASABI_BUCKET ?? ''
const ENV_ENDPOINT: string = import.meta.env.VITE_WASABI_ENDPOINT ?? ''
const ENV_REGION: string = import.meta.env.VITE_WASABI_REGION ?? ''

/** SigV4 presigned URLs live at most 7 days; refresh one day early. */
const URL_TTL_SECONDS = 604800
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000

interface WasabiConfig {
  /** Host without protocol, e.g. s3.ap-northeast-1.wasabisys.com */
  host: string
  /** Signing region, e.g. ap-northeast-1 */
  region: string
  bucket: string
}

let config: WasabiConfig | null = null
let initPromise: Promise<void> | null = null
const urlCache = new Map<string, { url: string; refreshAt: number }>()

/** Accepts a bare host, a URL, or a plain region name ('us-east-1'). */
function asHost(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  let v = value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (/^[a-z]{2}-[a-z]+-\d+$/.test(v)) v = `s3.${v}.wasabisys.com`
  return v.includes('.') ? v : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function regionFromHost(host: string): string {
  const m = /^s3[.-]([a-z0-9-]+)\.wasabisys\.com$/.exec(host)
  return m?.[1] ?? 'us-east-1'
}

/** Normalizes the region response into a WasabiConfig. */
function extractConfig(data: unknown): WasabiConfig | null {
  const candidates: unknown[] = []
  if (Array.isArray(data)) {
    candidates.push(...data)
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['regions', 'list', 'endpoints', 'items', 'nodes']) {
      if (Array.isArray(obj[key])) candidates.push(...(obj[key] as unknown[]))
    }
    candidates.push(obj)
  } else {
    candidates.push(data)
  }

  let host: string | undefined
  let region: string | undefined
  let bucket: string | undefined = ENV_BUCKET || undefined

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const o = candidate as Record<string, unknown>
      if (!host) {
        host =
          asHost(o.endpoint) ??
          asHost(o.host) ??
          asHost(o.domain) ??
          asHost(o.url) ??
          asHost(o.awsRegion) ??
          asHost(o.region) ??
          asHost(o.name)
      }
      if (!region) region = asString(o.awsRegion) ?? asString(o.region)
      if (!bucket) bucket = asString(o.bucket) ?? asString(o.bucketName)
    } else if (!host && typeof candidate === 'string') {
      host = asHost(candidate)
    }
    if (host && bucket) break
  }

  if (!host || !bucket) return null
  return { host, region: region ?? regionFromHost(host), bucket }
}

/** Full config from env — no network round-trip needed. */
function envConfig(): WasabiConfig | null {
  const host = asHost(ENV_ENDPOINT)
  if (!host || !ENV_BUCKET) return null
  return { host, region: ENV_REGION || regionFromHost(host), bucket: ENV_BUCKET }
}

async function fetchRegionConfig(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/v2/api/config/wasabi/region`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const json = (await response.json()) as { code: number; message?: string; data: unknown }
  if (json.code !== 0 && json.code !== 200) throw new Error(json.message || `code ${json.code}`)
  return json.data
}

/**
 * Loads the Wasabi config once (client only). Resolves either way — on
 * failure `config` stays null and getImageUrl returns undefined.
 */
export function initWasabi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!initPromise) {
    initPromise = (async () => {
      if (!ACCESS_KEY || !SECRET_KEY) return
      const env = envConfig()
      if (env) {
        config = env
        return
      }
      if (!API_BASE) return
      try {
        config = extractConfig(await fetchRegionConfig())
      } catch (error) {
        console.warn('[wasabi] region config unavailable:', error)
        config = null
      }
    })()
  }
  return initPromise
}

/** Wasabi object path convention: tournament images live under `league`. */
const PATH_KIND = {
  tournament: 'league',
  team: 'team',
  player: 'player',
} as const

export type ImageType = keyof typeof PATH_KIND

/**
 * Returns a presigned Wasabi URL for the image, or undefined when the
 * Wasabi config is unavailable (not initialized / missing env keys).
 */
export function getImageUrl(
  type: ImageType,
  id: string | number | undefined,
): string | undefined {
  if (id === undefined || id === '' || !config) return undefined
  const path = `/${config.bucket}/assets/${PATH_KIND[type]}/image/${id}.png`
  const cached = urlCache.get(path)
  const now = Date.now()
  if (cached && cached.refreshAt > now) return cached.url
  const url = presignGetUrl({
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
    host: config.host,
    region: config.region,
    path,
    expiresIn: URL_TTL_SECONDS,
  })
  urlCache.set(path, { url, refreshAt: now + URL_TTL_SECONDS * 1000 - REFRESH_MARGIN_MS })
  return url
}
