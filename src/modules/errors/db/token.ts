import { NotFoundException } from "@nestjs/common"

export class TokenNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "Token not found")
        this.name = "TOKEN_NOT_FOUND_EXCEPTION"
    }
}