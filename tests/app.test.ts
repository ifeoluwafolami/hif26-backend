import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import test from "node:test"
import { createApp } from "../src/app.js"
import type { NewWish, Wish } from "../src/types.js"
import type { WishRepository } from "../src/wish-repository.js"

class MemoryWishRepository implements WishRepository {
    private readonly wishes: Wish[] = []

    async list() {
        return [...this.wishes]
    }

    async create(input: NewWish) {
        const wish = {
            ...input,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
        }
        this.wishes.unshift(wish)
        return wish
    }
}

const startTestServer = async () => {
    const server = createServer(createApp({
        store: new MemoryWishRepository(),
        clientOrigin: "http://localhost:5173",
    }))

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Test server did not start")

    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve, reject) =>
            server.close((error) => error ? reject(error) : resolve()),
        ),
    }
}

test("creates and lists a wish", async (context) => {
    const server = await startTestServer()
    context.after(server.close)

    const createResponse = await fetch(`${server.baseUrl}/api/wishes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            name: "Ada",
            message: "Have a beautiful birthday!",
            activity: "Take a pottery class.",
            imageId: "IMG_1195",
        }),
    })
    assert.equal(createResponse.status, 201)

    const listResponse = await fetch(`${server.baseUrl}/api/wishes`)
    const body = await listResponse.json() as { wishes: Array<{ name: string }> }
    assert.equal(listResponse.status, 200)
    assert.equal(body.wishes[0]?.name, "Ada")
})

test("rejects invalid fields and unapproved images", async (context) => {
    const server = await startTestServer()
    context.after(server.close)

    const response = await fetch(`${server.baseUrl}/api/wishes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            name: "Ada",
            message: "Happy birthday!",
            activity: "Go somewhere lovely.",
            imageId: "https://example.com/not-allowed.jpg",
            admin: true,
        }),
    })

    assert.equal(response.status, 400)
})
