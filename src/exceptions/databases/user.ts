import { AbstractException } from "../abstract"

export class CannotCreateUserException extends AbstractException {
    constructor(message?: string) {
        super(message || "Cannot create user", "CANNOT_CREATE_USER_EXCEPTION")
    }
}