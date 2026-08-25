import { describe, it, expect } from 'vitest'
import { isPreviewAuthAllowed, assertPreviewAuthConfig } from '../lib/preview-auth'

describe('preview-auth', () => {
  describe('isPreviewAuthAllowed', () => {
    it('production + flag true → isPreviewAuthAllowed false', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'production', previewAuth: 'true', host: 'localhost:3000' })).toBe(false)
    })
    
    it('development + flag true + host localhost:3000 → allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: 'true', host: 'localhost:3000' })).toBe(true)
    })
    
    it('development + flag true + host 127.0.0.1:3000 → allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: 'true', host: '127.0.0.1:3000' })).toBe(true)
    })
    
    it('development + flag true + host example.com → not allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: 'true', host: 'example.com' })).toBe(false)
    })
    
    it('development + flag true + missing host → not allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: 'true', host: undefined })).toBe(false)
    })
    
    it('development + flag unset + localhost → not allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: undefined, host: 'localhost:3000' })).toBe(false)
    })

    it('development + flag true + host localhost without port → allowed', () => {
      expect(isPreviewAuthAllowed({ nodeEnv: 'development', previewAuth: 'true', host: 'localhost' })).toBe(true)
    })
  })

  describe('assertPreviewAuthConfig', () => {
    it('production + flag true → assertPreviewAuthConfig throws', () => {
      expect(() => assertPreviewAuthConfig('production', 'true')).toThrow(/strictly forbidden/)
    })
    
    it('production + flag unset → assertPreviewAuthConfig does not throw', () => {
      expect(() => assertPreviewAuthConfig('production', undefined)).not.toThrow()
    })
  })
})
