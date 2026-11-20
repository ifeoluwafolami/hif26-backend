import assert from "node:assert/strict"
import test from "node:test"
import { parseNewWish } from "../src/validation.js"

test("normalizes valid wish input", () => {
    const wish = parseNewWish({
        name: "  Ada  ",
        message: "  Happy birthday!  ",
        activity: "  Take a pottery class.  ",
        imageId: "IMG_1195",
    })

    assert.deepEqual(wish, {
        name: "Ada",
        message: "Happy birthday!",
        activity: "Take a pottery class.",
        imageId: "IMG_1195",
    })
})

test("rejects unknown fields and unapproved images", () => {
    assert.throws(() => parseNewWish({
        name: "Ada",
        message: "Happy birthday!",
        activity: "Take a pottery class.",
        imageId: "https://example.com/photo.jpg",
        admin: true,
    }))
})
