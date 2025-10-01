import { NotFoundException } from "@nestjs/common"

export class LiquidityProvisionBotNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "Liquidity provision bot not found")
        this.name = "LIQUIDITY_PROVISION_BOT_NOT_FOUND_EXCEPTION"
    }
}