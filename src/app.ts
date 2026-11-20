import type { IncomingMessage, ServerResponse } from "node:http"
import { parseNewWish, ValidationError } from "./validation.js"
import type { WishRepository } from "./wish-repository.js"

type AppOptions = {
    store: WishRepository
    clientOrigin: string
}

const maximumBodySize = 16 * 1024
const rateLimitWindow = 60_000
const rateLimitMaximum = 10

const sendJson = (response: ServerResponse, status: number, body: unknown) => {
    const contents = JSON.stringify(body)
    response.statusCode = status
    response.setHeader("content-type", "application/json; charset=utf-8")
    response.setHeader("content-length", Buffer.byteLength(contents))
    response.end(contents)
}

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
    const contentType = request.headers["content-type"] ?? ""
    if (!contentType.toLowerCase().startsWith("application/json")) {
        throw new ValidationError("content-type must be application/json")
    }

    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += buffer.byteLength
        if (size > maximumBodySize) {
            throw new ValidationError("request body is too large")
        }
        chunks.push(buffer)
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
    } catch {
        throw new ValidationError("request body must contain valid JSON")
    }
}

export const createApp = ({ store, clientOrigin }: AppOptions) => {
    const rateLimits = new Map<string, { count: number; resetAt: number }>()

    return async (request: IncomingMessage, response: ServerResponse) => {
        response.setHeader("x-content-type-options", "nosniff")
        response.setHeader("referrer-policy", "no-referrer")
        response.setHeader("cache-control", "no-store")

        const origin = request.headers.origin
        if (origin === clientOrigin) {
            response.setHeader("access-control-allow-origin", origin)
            response.setHeader("vary", "Origin")
            response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
            response.setHeader("access-control-allow-headers", "Content-Type")
        } else if (origin) {
            sendJson(response, 403, { error: "Origin is not allowed" })
            return
        }

        if (request.method === "OPTIONS") {
            response.statusCode = 204
            response.end()
            return
        }

        const url = new URL(request.url ?? "/", "http://localhost")

        try {
            if (request.method === "GET" && url.pathname === "/health") {
                sendJson(response, 200, { status: "ok" })
                return
            }

            if (request.method === "GET" && url.pathname === "/api/wishes") {
                sendJson(response, 200, { wishes: await store.list() })
                return
            }

            if (request.method === "POST" && url.pathname === "/api/wishes") {
                const key = request.socket.remoteAddress ?? "unknown"
                const now = Date.now()
                const current = rateLimits.get(key)
                const rateLimit = !current || current.resetAt <= now
                    ? { count: 0, resetAt: now + rateLimitWindow }
                    : current

                rateLimit.count += 1
                rateLimits.set(key, rateLimit)
                response.setHeader("x-ratelimit-limit", rateLimitMaximum)
                response.setHeader("x-ratelimit-remaining", Math.max(0, rateLimitMaximum - rateLimit.count))

                if (rateLimit.count > rateLimitMaximum) {
                    response.setHeader("retry-after", Math.ceil((rateLimit.resetAt - now) / 1000))
                    sendJson(response, 429, { error: "Too many submissions. Please try again shortly." })
                    return
                }

                const input = parseNewWish(await readJsonBody(request))
                sendJson(response, 201, { wish: await store.create(input) })
                return
            }

            sendJson(response, 404, { error: "Not found" })
        } catch (error) {
            if (error instanceof ValidationError) {
                sendJson(response, 400, { error: error.message })
                return
            }

            console.error(error)
            sendJson(response, 500, { error: "The wish could not be saved. Please try again." })
        }
    }
}
