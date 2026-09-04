export interface AppConfig {
  port: number
  host: string
  maxReplacements: number
  maxBodyBytes: number
}

export type EnvironmentSource = Record<string, string | undefined>

export const configDefaults = {
  port: 3000,
  host: '0.0.0.0',
  maxReplacements: Number.MAX_SAFE_INTEGER,
  maxBodyBytes: 1048576,
} as const

const integerPattern = /^-?\d+$/

function readInteger(
  env: EnvironmentSource,
  name: string,
  fallback: number,
): number {
  const raw = env[name]
  if (raw === undefined) {
    return fallback
  }
  if (!integerPattern.test(raw)) {
    throw new Error(`${name} must be an integer, received "${raw}"`)
  }
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer, received "${raw}"`)
  }
  return value
}

function readHost(env: EnvironmentSource): string {
  const raw = env.HOST
  if (raw === undefined) {
    return configDefaults.host
  }
  if (raw.trim() === '') {
    throw new Error('HOST must not be empty')
  }
  return raw
}

export function parseConfig(env: EnvironmentSource): AppConfig {
  const port = readInteger(env, 'PORT', configDefaults.port)
  if (port < 1 || port > 65535) {
    throw new Error(`PORT must be between 1 and 65535, received ${port}`)
  }

  const maxReplacements = readInteger(
    env,
    'MAX_REPLACEMENTS',
    configDefaults.maxReplacements,
  )
  if (maxReplacements < 0) {
    throw new Error(
      `MAX_REPLACEMENTS must be a non-negative integer, received ${maxReplacements}`,
    )
  }

  const maxBodyBytes = readInteger(
    env,
    'MAX_BODY_BYTES',
    configDefaults.maxBodyBytes,
  )
  if (maxBodyBytes < 1) {
    throw new Error(
      `MAX_BODY_BYTES must be a positive integer, received ${maxBodyBytes}`,
    )
  }

  return {
    port,
    host: readHost(env),
    maxReplacements,
    maxBodyBytes,
  }
}

export function loadConfig(): AppConfig {
  return parseConfig(process.env)
}
