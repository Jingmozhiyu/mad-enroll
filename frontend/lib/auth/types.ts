export type AuthPayload = {
    email: string
    password: string
}

export type ClientSession = {
    userId: string
    email: string
}

export type UserSession = ClientSession & {
    token: string
}
