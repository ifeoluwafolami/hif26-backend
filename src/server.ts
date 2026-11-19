import { createServer } from "node:http"
import { resolve } from "node:path"
import { loadEnvFile } from "node:process"
import { createApp } from "./app.js"
import { WishStore } from "./wish-store.js"

try {
    loadEnvFile()
} catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error
    }
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10)
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
const dataFile = resolve(process.env.DATA_FILE ?? "data/wishes.json")

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535")
}

const store = new WishStore(dataFile)
const server = createServer(createApp({ store, clientOrigin }))

server.listen(port, () => {
    console.log(`HIF26 API listening on http://localhost:${port}`)
})
