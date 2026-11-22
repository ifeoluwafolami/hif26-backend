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

test("accepts the maximum wish and bucket-list lengths", () => {
    const wish = parseNewWish({
        name: "Ada",
        message: "m".repeat(1000),
        activity: "a".repeat(500),
        imageId: "IMG_1195",
    })

    assert.equal(wish.message.length, 1000)
    assert.equal(wish.activity.length, 500)
})

test("rejects wishes and bucket-list entries over their limits", () => {
    assert.throws(() => parseNewWish({
        name: "Ada",
        message: "m".repeat(1001),
        activity: "Take a pottery class.",
        imageId: "IMG_1195",
    }), /message must be 1000 characters or fewer/)

    assert.throws(() => parseNewWish({
        name: "Ada",
        message: "Happy birthday!",
        activity: "a".repeat(501),
        imageId: "IMG_1195",
    }), /activity must be 500 characters or fewer/)
})
