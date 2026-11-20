import type { NewWish, Wish } from "./types.js"

export interface WishRepository {
    list(): Promise<Wish[]>
    create(input: NewWish): Promise<Wish>
}
