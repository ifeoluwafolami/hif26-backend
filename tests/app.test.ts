import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import test from "node:test"
import { createApp } from "../src/app.js"
import type { NewWish, Wish } from "../src/types.js"
import type { WishRepository } from "../src/wish-repository.js"

class MemoryWishRepository implements WishRepository {
    private readonly wishes: Array<Wish & { editTokenHash: string }> = []

    private publicWish({ editTokenHash: _editTokenHash, ...wish }: Wish & { editTokenHash: string }) {
        return wish
    }

    async list() {
        return this.wishes.map((wish) => this.publicWish(wish))
    }

    async create(input: NewWish, editTokenHash: string) {
        const wish = {
            ...input,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            editTokenHash,
        }
        this.wishes.unshift(wish)
        return this.publicWish(wish)
    }

    async update(id: string, input: NewWish, editTokenHash: string, createdAfter: string) {
        const wish = this.wishes.find((candidate) =>
            candidate.id === id
            && candidate.editTokenHash === editTokenHash
            && candidate.createdAt >= createdAfter,
        )
        if (!wish) return null
        Object.assign(wish, input)
        return this.publicWish(wish)
    }

    async delete(id: string, editTokenHash: string, createdAfter: string) {
        const index = this.wishes.findIndex((candidate) =>
            candidate.id === id
            && candidate.editTokenHash === editTokenHash
            && candidate.createdAt >= createdAfter,
        )
        if (index < 0) return false
        this.wishes.splice(index, 1)
        return true
    }
}

const startTestServer = async (
    clientOrigin = "http://localhost:5173",
    trustProxy = false,
    now?: () => Date,
) => {
    const server = createServer(createApp({
        store: new MemoryWishRepository(), clientOrigin, trustProxy, now,
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

    const createdBody = await createResponse.json() as { editToken: string }
    assert.ok(createdBody.editToken)

    const listResponse = await fetch(`${server.baseUrl}/api/wishes`)
    const body = await listResponse.json() as { wishes: Array<{ name: string }> }
    assert.equal(listResponse.status, 200)
    assert.equal(body.wishes[0]?.name, "Ada")
})

test("edits and deletes a wish during its one-minute window", async (context) => {
    const server = await startTestServer()
    context.after(server.close)

    const createResponse = await fetch(`${server.baseUrl}/api/wishes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            name: "Ada",
            message: "Happy birthday!",
            activity: "Take a pottery class.",
            imageId: "IMG_1195",
        }),
    })
    const created = await createResponse.json() as { wish: Wish; editToken: string }

    const updateResponse = await fetch(`${server.baseUrl}/api/wishes/${created.wish.id}`, {
        method: "PATCH",
        headers: {
            authorization: `Bearer ${created.editToken}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            name: "Ada",
            message: "Have the happiest birthday!",
            activity: "Take a pottery class.",
            imageId: "IMG_1195",
        }),
    })
    assert.equal(updateResponse.status, 200)
    const updated = await updateResponse.json() as { wish: Wish }
    assert.equal(updated.wish.message, "Have the happiest birthday!")

    const deleteResponse = await fetch(`${server.baseUrl}/api/wishes/${created.wish.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${created.editToken}` },
    })
    assert.equal(deleteResponse.status, 204)

    const listResponse = await fetch(`${server.baseUrl}/api/wishes`)
    const listed = await listResponse.json() as { wishes: Wish[] }
    assert.equal(listed.wishes.length, 0)
})

test("rejects editing with the wrong token or after one minute", async (context) => {
    const future = new Date(Date.now() + 61_000)
    const server = await startTestServer("http://localhost:5173", false, () => future)
    context.after(server.close)

    const wishInput = {
        name: "Ada",
        message: "Happy birthday!",
        activity: "Take a pottery class.",
        imageId: "IMG_1195",
    }
    const createResponse = await fetch(`${server.baseUrl}/api/wishes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(wishInput),
    })
    const created = await createResponse.json() as { wish: Wish; editToken: string }

    for (const token of ["wrong-token", created.editToken]) {
        const response = await fetch(`${server.baseUrl}/api/wishes/${created.wish.id}`, {
            method: "PATCH",
            headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify(wishInput),
        })
        assert.equal(response.status, 403)
    }
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


test("allows each configured origin and rejects unlisted origins", async (context) => {
    const server = await startTestServer("http://localhost:5173, https://ifeoluwafolami.com,https://hif26.ifeoluwafolami.com")
    context.after(server.close)
    for (const origin of ["http://localhost:5173", "https://ifeoluwafolami.com", "https://hif26.ifeoluwafolami.com"]) {
        const response = await fetch(`${server.baseUrl}/api/wishes`, { method: "OPTIONS", headers: { origin } })
        assert.equal(response.status, 204)
        assert.equal(response.headers.get("access-control-allow-origin"), origin)
    }
    const response = await fetch(`${server.baseUrl}/health`, { headers: { origin: "https://unlisted.example" } })
    assert.equal(response.status, 403)
    assert.equal(response.headers.get("access-control-allow-origin"), null)
})

test("separates clients behind a trusted proxy without trusting headers by default", async (context) => {
    for (const trustProxy of [false, true]) {
        const server = await startTestServer("http://localhost:5173", trustProxy)
        context.after(server.close)
        for (let i = 0; i < 11; i++) {
            const response = await fetch(`${server.baseUrl}/api/wishes`, {
                method: "POST", headers: { "content-type": "application/json", "x-real-ip": `192.0.2.${i + 1}` }, body: "{}",
            })
            assert.equal(response.status, !trustProxy && i === 10 ? 429 : 400)
        }
    }
})
