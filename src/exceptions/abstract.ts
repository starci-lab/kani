export abstract class AbstractException extends Error {
    readonly code: string
    constructor(message: string, name: string) {
        super(message)
        this.name = name
    }
}