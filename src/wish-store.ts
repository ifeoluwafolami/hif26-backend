import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { NewWish, Wish, WishDatabase } from "./types.js"
import { parseDatabase } from "./validation.js"

const emptyDatabase = (): WishDatabase => ({ wishes: [] })

export class WishStore {
    private writeQueue: Promise<void> = Promise.resolve()

    constructor(private readonly filePath: string) {}

    async list(): Promise<Wish[]> {
        const database = await this.read()
        return [...database.wishes].sort((first, second) =>
            second.createdAt.localeCompare(first.createdAt),
        )
    }

    create(input: NewWish): Promise<Wish> {
        const operation = this.writeQueue.then(async () => {
            const database = await this.read()
            const wish: Wish = {
                ...input,
                id: randomUUID(),
                createdAt: new Date().toISOString(),
            }

            await this.write({ wishes: [wish, ...database.wishes] })
            return wish
        })

        this.writeQueue = operation.then(() => undefined, () => undefined)
        return operation
    }

    private async read(): Promise<WishDatabase> {
        try {
            const contents = await readFile(this.filePath, "utf8")
            return parseDatabase(JSON.parse(contents) as unknown)
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                const database = emptyDatabase()
                await this.write(database)
                return database
            }
            if (error instanceof SyntaxError) {
                throw new Error("Wish data file contains invalid JSON", { cause: error })
            }
            throw error
        }
    }

    private async write(database: WishDatabase): Promise<void> {
        await mkdir(dirname(this.filePath), { recursive: true })
        const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
        const contents = `${JSON.stringify(database, null, 2)}\n`

        await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" })
        await rename(temporaryPath, this.filePath)
    }
}
