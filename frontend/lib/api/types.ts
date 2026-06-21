export type ApiEnvelope<T> = {
    code: number
    msg: string
    data: T
}
