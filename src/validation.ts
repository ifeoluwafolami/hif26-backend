import { imageIds } from "./image-ids.js"
import type { NewWish, Wish, WishDatabase } from "./types.js"

export class ValidationError extends Error {}

const wishInputKeys = new Set(["name", "message", "activity", "imageId"])

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const readString = (
    value: unknown,
    field: string,
    maximumLength: number,
) => {
    if (typeof value !== "string") {
        throw new ValidationError(`${field} must be a string`)
    }

    const cleaned = value.trim()
    if (cleaned.length === 0) {
        throw new ValidationError(`${field} is required`)
    }
    if (cleaned.length > maximumLength) {
        throw new ValidationError(`${field} must be ${maximumLength} characters or fewer`)
    }

    return cleaned
}

export const parseNewWish = (value: unknown): NewWish => {
    if (!isRecord(value)) {
        throw new ValidationError("request body must be an object")
    }

    const unknownKey = Object.keys(value).find((key) => !wishInputKeys.has(key))
    if (unknownKey) {
        throw new ValidationError(`unknown field: ${unknownKey}`)
    }

    const imageId = readString(value.imageId, "imageId", 100)
    if (!imageIds.has(imageId)) {
        throw new ValidationError("imageId is not an available photo")
    }

    return {
        name: readString(value.name, "name", 60),
        message: readString(value.message, "message", 600),
        activity: readString(value.activity, "activity", 240),
        imageId,
    }
}

const isStoredWish = (value: unknown): value is Wish => {
    if (!isRecord(value)) return false

    return typeof value.id === "string"
        && typeof value.name === "string"
        && typeof value.message === "string"
        && typeof value.activity === "string"
        && typeof value.imageId === "string"
        && typeof value.createdAt === "string"
}

export const parseDatabase = (value: unknown): WishDatabase => {
    if (!isRecord(value) || !Array.isArray(value.wishes) || !value.wishes.every(isStoredWish)) {
        throw new Error("Wish data file has an invalid structure")
    }

    return { wishes: value.wishes }
}
