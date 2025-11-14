import { NotFoundException } from "@nestjs/common"

export class BotNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "Bot not found")
        this.name = "BOT_NOT_FOUND_EXCEPTION"
    }
}
