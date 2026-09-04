import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { AppConfig } from '../src/config'
import { JsonValue } from '../src/types'

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 3000,
    host: '127.0.0.1',
    maxReplacements: Number.MAX_SAFE_INTEGER,
    maxBodyBytes: 1048576,
    ...overrides,
  }
}

async function postTransform(config: AppConfig, payload: string) {
  const app = buildApp(config)
  const response = await app.inject({
    method: 'POST',
    url: '/transform',
    headers: { 'content-type': 'application/json' },
    payload,
  })
  await app.close()
  return response
}

function parseBody(body: string): JsonValue {
  return JSON.parse(body) as JsonValue
}

describe('POST /transform', () => {
  it('transforms matching values in an object', async () => {
    const response = await postTransform(
      testConfig(),
      JSON.stringify({ pet: 'dog', name: 'Rex' }),
    )

    expect(response.statusCode).toBe(200)
    expect(parseBody(response.body)).toEqual({ pet: 'cat', name: 'Rex' })
  })

  it('transforms nested structures', async () => {
    const response = await postTransform(
      testConfig(),
      JSON.stringify({ pets: ['dog', { kind: 'dog' }], dog: 'dog' }),
    )

    expect(response.statusCode).toBe(200)
    expect(parseBody(response.body)).toEqual({
      pets: ['cat', { kind: 'cat' }],
      dog: 'cat',
    })
  })

  it('honors the configured replacement maximum', async () => {
    const response = await postTransform(
      testConfig({ maxReplacements: 2 }),
      JSON.stringify(['dog', 'dog', 'dog']),
    )

    expect(response.statusCode).toBe(200)
    expect(parseBody(response.body)).toEqual(['cat', 'cat', 'dog'])
  })

  it('performs no replacements when the maximum is zero', async () => {
    const response = await postTransform(
      testConfig({ maxReplacements: 0 }),
      JSON.stringify(['dog']),
    )

    expect(response.statusCode).toBe(200)
    expect(parseBody(response.body)).toEqual(['dog'])
  })

  it('transforms a root string value', async () => {
    const response = await postTransform(testConfig(), JSON.stringify('dog'))

    expect(response.statusCode).toBe(200)
    expect(parseBody(response.body)).toBe('cat')
  })

  it('returns root primitive values unchanged', async () => {
    const cases: JsonValue[] = ['bird', 42, true, null]

    for (const value of cases) {
      const response = await postTransform(testConfig(), JSON.stringify(value))

      expect(response.statusCode).toBe(200)
      expect(parseBody(response.body)).toEqual(value)
    }
  })

  it('rejects malformed JSON with a 400 response', async () => {
    const response = await postTransform(testConfig(), '{"pet": "dog"')

    expect(response.statusCode).toBe(400)
  })

  it('rejects oversized request bodies with a 413 response', async () => {
    const response = await postTransform(
      testConfig({ maxBodyBytes: 16 }),
      JSON.stringify({ pet: 'dog', filler: 'x'.repeat(64) }),
    )

    expect(response.statusCode).toBe(413)
  })
})
