import { createServer } from "node:http"
import { loadEnvFile } from "node:process"
import { createApp } from "./app.js"
import { connectToMongo } from "./mongo-wish-repository.js"

try {
    loadEnvFile()
} catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error
    }
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10)
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
const mongoUri = process.env.MONGODB_URI
const mongoDatabase = process.env.MONGODB_DB ?? "hif26"

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535")
}
if (!mongoUri) {
    throw new Error("MONGODB_URI is required")
}

const { client, store } = await connectToMongo(mongoUri, mongoDatabase)
const server = createServer(createApp({ store, clientOrigin }))

const shutdown = () => {
    server.close(() => {
        void client.close().finally(() => process.exit(0))
    })
}

process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)

server.listen(port, () => {
    console.log(`HIF26 API listening on http://localhost:${port}`)
})
