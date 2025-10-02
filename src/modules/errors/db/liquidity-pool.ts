import { NotFoundException } from "@nestjs/common"

export class LiquidityPoolNotFoundException extends NotFoundException {
    constructor(message?: string) {
        super(message || "Liquidity pool not found")
        this.name = "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION"
    }
}