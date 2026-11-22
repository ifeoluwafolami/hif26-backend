import type { NewWish, Wish } from "./types.js"

export interface WishRepository {
    list(): Promise<Wish[]>
    create(input: NewWish, editTokenHash: string): Promise<Wish>
    update(id: string, input: NewWish, editTokenHash: string, createdAfter: string): Promise<Wish | null>
    delete(id: string, editTokenHash: string, createdAfter: string): Promise<boolean>
}
