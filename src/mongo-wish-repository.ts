import { randomUUID } from "node:crypto"
import { MongoClient, type Collection } from "mongodb"
import type { NewWish, Wish } from "./types.js"
import type { WishRepository } from "./wish-repository.js"

type WishDocument = Omit<Wish, "id"> & { _id: string }

export class MongoWishRepository implements WishRepository {
    constructor(private readonly collection: Collection<WishDocument>) {}

    async list(): Promise<Wish[]> {
        const documents = await this.collection
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        return documents.map(({ _id, ...wish }) => ({
            id: _id,
            ...wish,
        }))
    }

    async create(input: NewWish): Promise<Wish> {
        const wish: Wish = {
            ...input,
            id: randomUUID(),
            createdAt: new Date().toISOString(),
        }
        const { id, ...fields } = wish

        await this.collection.insertOne({ _id: id, ...fields })
        return wish
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
