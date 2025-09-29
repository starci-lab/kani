import { NotFoundException } from "@nestjs/common"

export class SessionNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message ?? "Session not found")
        this.name = "SESSION_NOT_FOUND_EXCEPTION"
    }
}