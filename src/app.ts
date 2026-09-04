import Fastify, { FastifyInstance } from 'fastify'
import { AppConfig } from './config'
import { transformJson } from './transform'
import { JsonValue } from './types'

export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    bodyLimit: config.maxBodyBytes,
  })

  app.post<{ Body: JsonValue }>('/transform', (request, reply) => {
    const result = transformJson(request.body, config.maxReplacements)
    reply
      .type('application/json; charset=utf-8')
      .send(JSON.stringify(result.value))
  })

  return app
}
