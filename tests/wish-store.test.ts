import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { WishStore } from "../src/wish-store.js"

const newWish = (name: string) => ({
    name,
    message: `Happy birthday from ${name}`,
    activity: "Take a joyful day trip.",
    imageId: "IMG_1195",
})

test("creates the data file and persists wishes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hif26-store-"))
    const file = join(directory, "data", "wishes.json")
    const store = new WishStore(file)

    const created = await store.create(newWish("Ada"))
    const saved = await store.list()

    assert.equal(saved.length, 1)
    assert.equal(saved[0]?.id, created.id)
    assert.equal(saved[0]?.name, "Ada")
    const contents = await readFile(file, "utf8")
    assert.doesNotThrow(() => JSON.parse(contents))
})

test("serializes concurrent writes without losing wishes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hif26-store-"))
    const store = new WishStore(join(directory, "wishes.json"))

    await Promise.all(Array.from({ length: 20 }, (_, index) =>
        store.create(newWish(`Guest ${index}`)),
    ))

    const saved = await store.list()
    assert.equal(saved.length, 20)
    assert.equal(new Set(saved.map(({ id }) => id)).size, 20)
})

test("does not overwrite a malformed data file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hif26-store-"))
    const file = join(directory, "data", "wishes.json")
    await mkdir(join(directory, "data"))
    await writeFile(file, "{not valid json", "utf8")
    const store = new WishStore(file)

    await assert.rejects(() => store.create(newWish("Ada")), /invalid JSON/)
    assert.equal(await readFile(file, "utf8"), "{not valid json")
})
