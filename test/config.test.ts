import { describe, expect, it } from 'vitest'
import { configDefaults, parseConfig } from '../src/config'

describe('parseConfig', () => {
  it('returns defaults when no values are provided', () => {
    const config = parseConfig({})

    expect(config).toEqual({
      port: configDefaults.port,
      host: configDefaults.host,
      maxReplacements: configDefaults.maxReplacements,
      maxBodyBytes: configDefaults.maxBodyBytes,
    })
  })

  it('accepts valid custom values', () => {
    const config = parseConfig({
      PORT: '8080',
      HOST: '127.0.0.1',
      MAX_REPLACEMENTS: '5',
      MAX_BODY_BYTES: '2048',
    })

    expect(config).toEqual({
      port: 8080,
      host: '127.0.0.1',
      maxReplacements: 5,
      maxBodyBytes: 2048,
    })
  })

  it('accepts zero MAX_REPLACEMENTS', () => {
    expect(parseConfig({ MAX_REPLACEMENTS: '0' }).maxReplacements).toBe(0)
  })

  it('rejects negative MAX_REPLACEMENTS', () => {
    expect(() => parseConfig({ MAX_REPLACEMENTS: '-1' })).toThrow(
      /MAX_REPLACEMENTS/,
    )
  })

  it('rejects decimal MAX_REPLACEMENTS', () => {
    expect(() => parseConfig({ MAX_REPLACEMENTS: '1.5' })).toThrow(
      /MAX_REPLACEMENTS/,
    )
  })

  it('rejects malformed MAX_REPLACEMENTS', () => {
    expect(() => parseConfig({ MAX_REPLACEMENTS: '10abc' })).toThrow(
      /MAX_REPLACEMENTS/,
    )
  })

  it('rejects empty MAX_REPLACEMENTS', () => {
    expect(() => parseConfig({ MAX_REPLACEMENTS: '' })).toThrow(
      /MAX_REPLACEMENTS/,
    )
  })

  it('rejects unsafe MAX_REPLACEMENTS', () => {
    expect(() => parseConfig({ MAX_REPLACEMENTS: '9007199254740992' })).toThrow(
      /MAX_REPLACEMENTS/,
    )
  })

  it('accepts valid MAX_BODY_BYTES', () => {
    expect(parseConfig({ MAX_BODY_BYTES: '1024' }).maxBodyBytes).toBe(1024)
  })

  it('rejects zero MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '0' })).toThrow(/MAX_BODY_BYTES/)
  })

  it('rejects negative MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '-1024' })).toThrow(
      /MAX_BODY_BYTES/,
    )
  })

  it('rejects decimal MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '10.5' })).toThrow(
      /MAX_BODY_BYTES/,
    )
  })

  it('rejects malformed MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '2kb' })).toThrow(
      /MAX_BODY_BYTES/,
    )
  })

  it('rejects empty MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '' })).toThrow(/MAX_BODY_BYTES/)
  })

  it('rejects unsafe MAX_BODY_BYTES', () => {
    expect(() => parseConfig({ MAX_BODY_BYTES: '9007199254740992' })).toThrow(
      /MAX_BODY_BYTES/,
    )
  })

  it('accepts a valid PORT', () => {
    expect(parseConfig({ PORT: '65535' }).port).toBe(65535)
  })

  it('rejects PORT below 1', () => {
    expect(() => parseConfig({ PORT: '0' })).toThrow(/PORT/)
  })

  it('rejects PORT above 65535', () => {
    expect(() => parseConfig({ PORT: '65536' })).toThrow(/PORT/)
  })

  it('rejects decimal PORT', () => {
    expect(() => parseConfig({ PORT: '80.5' })).toThrow(/PORT/)
  })

  it('rejects malformed PORT', () => {
    expect(() => parseConfig({ PORT: '10abc' })).toThrow(/PORT/)
  })

  it('rejects empty HOST', () => {
    expect(() => parseConfig({ HOST: ' ' })).toThrow(/HOST/)
  })
})
