export function isPreviewAuthAllowed(args: {
  nodeEnv: string | undefined
  previewAuth: string | undefined
  host: string | undefined
}): boolean {
  if (args.nodeEnv === 'production') return false
  if (args.previewAuth !== 'true') return false
  if (!args.host) return false
  const h = args.host.split(':')[0]
  if (h !== 'localhost' && h !== '127.0.0.1') return false
  return true
}

export function assertPreviewAuthConfig(nodeEnv: string | undefined, previewAuth: string | undefined) {
  if (nodeEnv === 'production' && previewAuth === 'true') {
    throw new Error('CRITICAL: PREVIEW_AUTH=true is strictly forbidden in production builds.')
  }
}
