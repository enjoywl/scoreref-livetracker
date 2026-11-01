/**
 * 构建期默认的 Wasabi 配置（小型项目直接内置，参考 API 的 application-prod.yml）。
 *
 * 注意：presign 在浏览器端执行，这些值最终会内联进公开的 JS bundle，
 * 无法作为真正的服务端密钥保密。仍可用 VITE_WASABI_* 或 docker build-arg 覆盖。
 */
export const WASABI_DEFAULTS = {
  accessKey: "Y5NN3KZFMZCYYDD80CF8",
  secretKey: "mGyi8MuEUjX6u22PQaUjUwMw0omO6yhHYpQYwu9m",
  endpoint: "https://s3.ap-northeast-1.wasabisys.com",
  bucket: "soccer-jp",
} as const
