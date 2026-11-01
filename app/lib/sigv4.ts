/**
 * AWS Signature Version 4 presigned URLs, computed synchronously.
 *
 * `crypto.subtle` is async, but `getImageUrl` is called synchronously during
 * render, so this module ships a small pure-JS SHA-256/HMAC-SHA256 instead.
 * Only used for SigV4, so inputs are always ASCII.
 */

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8
  // pad to a multiple of 64 bytes: message + 0x80 + zeros + 8-byte length
  const paddedLen = (((data.length + 8) >> 6) + 1) << 6
  const buf = new Uint8Array(paddedLen)
  buf.set(data)
  buf[data.length] = 0x80
  const view = new DataView(buf.buffer)
  view.setUint32(paddedLen - 4, bitLen >>> 0) // bitLen < 2^32 for our inputs

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)

  for (let block = 0; block < paddedLen; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = h[0], b = h[1], c = h[2], d = h[3]
    let e = h[4], f = h[5], g = h[6], hh = h[7]

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + s1 + ch + SHA256_K[i] + w[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }

  const out = new Uint8Array(32)
  const outView = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i])
  return out
}

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key
  if (k.length > 64) k = sha256(k)
  const inner = new Uint8Array(64 + message.length)
  const outer = new Uint8Array(64 + 32)
  for (let i = 0; i < 64; i++) {
    const b = i < k.length ? k[i] : 0
    inner[i] = b ^ 0x36
    outer[i] = b ^ 0x5c
  }
  inner.set(message, 64)
  outer.set(sha256(inner), 64)
  return sha256(outer)
}

export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

const encoder = new TextEncoder()

export interface SigV4PresignInput {
  accessKey: string
  secretKey: string
  /** Host without protocol, e.g. s3.us-east-1.wasabisys.com */
  host: string
  /** Signing region, e.g. us-east-1 */
  region: string
  /** Object URI path including leading slash, e.g. /bucket/assets/team/image/1.png */
  path: string
  /** Seconds until the URL expires (max 604800 = 7 days) */
  expiresIn: number
  now?: Date
}

/** Builds a SigV4 presigned GET URL (query-string auth, UNSIGNED-PAYLOAD). */
export function presignGetUrl(input: SigV4PresignInput): string {
  const now = input.now ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
  const amzDate = `${dateStamp}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const credentialScope = `${dateStamp}/${input.region}/s3/aws4_request`

  // query params are already in canonical (alphabetical) order
  const canonicalQuery =
    `X-Amz-Algorithm=AWS4-HMAC-SHA256` +
    `&X-Amz-Credential=${encodeURIComponent(`${input.accessKey}/${credentialScope}`)}` +
    `&X-Amz-Date=${amzDate}` +
    `&X-Amz-Expires=${input.expiresIn}` +
    `&X-Amz-SignedHeaders=host`

  const canonicalRequest = [
    'GET',
    input.path,
    canonicalQuery,
    `host:${input.host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    toHex(sha256(encoder.encode(canonicalRequest))),
  ].join('\n')

  const kDate = hmacSha256(encoder.encode(`AWS4${input.secretKey}`), encoder.encode(dateStamp))
  const kRegion = hmacSha256(kDate, encoder.encode(input.region))
  const kService = hmacSha256(kRegion, encoder.encode('s3'))
  const kSigning = hmacSha256(kService, encoder.encode('aws4_request'))
  const signature = toHex(hmacSha256(kSigning, encoder.encode(stringToSign)))

  return `https://${input.host}${input.path}?${canonicalQuery}&X-Amz-Signature=${signature}`
}
