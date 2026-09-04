import { buildApp } from './app'
import { loadConfig } from './config'

async function start(): Promise<void> {
  const config = loadConfig()
  const app = buildApp(config)
  await app.listen({ port: config.port, host: config.host })
}

start().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
