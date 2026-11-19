export type Wish = {
    id: string
    name: string
    message: string
    activity: string
    imageId: string
    createdAt: string
}

export type NewWish = Pick<Wish, "name" | "message" | "activity" | "imageId">

export type WishDatabase = {
    wishes: Wish[]
}
