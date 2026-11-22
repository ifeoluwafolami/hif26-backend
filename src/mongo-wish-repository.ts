import { randomUUID } from "node:crypto"
import { MongoClient, type Collection } from "mongodb"
import type { NewWish, Wish } from "./types.js"
import type { WishRepository } from "./wish-repository.js"

type WishDocument = Omit<Wish, "id"> & {
    _id: string
    editTokenHash: string
}

const wishFromDocument = ({ _id, name, message, activity, imageId, createdAt }: WishDocument): Wish => ({
    id: _id,
    name,
    message,
    activity,
    imageId,
    createdAt,
})

export class MongoWishRepository implements WishRepository {
    constructor(private readonly collection: Collection<WishDocument>) {}

    async list(): Promise<Wish[]> {
        const documents = await this.collection
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        return documents.map(wishFromDocument)
    }

    async create(input: NewWish, editTokenHash: string): Promise<Wish> {
        const wish: Wish = {
            ...input,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
        }
        const { id, ...fields } = wish

        await this.collection.insertOne({ _id: id, ...fields, editTokenHash })
        return wish
    }

    async update(id: string, input: NewWish, editTokenHash: string, createdAfter: string): Promise<Wish | null> {
        const document = await this.collection.findOneAndUpdate(
            { _id: id, editTokenHash, createdAt: { $gte: createdAfter } },
            { $set: input },
            { returnDocument: "after" },
        )

        return document ? wishFromDocument(document) : null
    }

    async delete(id: string, editTokenHash: string, createdAfter: string): Promise<boolean> {
        const result = await this.collection.deleteOne({
            _id: id,
            editTokenHash,
            createdAt: { $gte: createdAfter },
        })
        return result.deletedCount === 1
    }
}

export const connectToMongo = async (uri: string, databaseName: string) => {
    const client = new MongoClient(uri)
    await client.connect()

    const collection = client
        .db(databaseName)
        .collection<WishDocument>("wishes")

    await collection.createIndex({ createdAt: -1 })

    return {
        client,
        store: new MongoWishRepository(collection),
    }
}
