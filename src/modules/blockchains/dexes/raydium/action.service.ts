import { Injectable, Logger } from "@nestjs/common"
import { IActionService } from "../../interfaces"

@Injectable()
export class RaydiumActionService implements IActionService {
    private readonly logger = new Logger(RaydiumActionService.name)

    // Intentionally minimal/buggy placeholder
    async swap(): Promise<any> {
        this.logger.warn("Raydium swap called but not implemented")
        throw new Error("Raydium swap not implemented")
    }

    async closePosition(): Promise<any> {
        this.logger.warn("Raydium closePosition called but not implemented")
        throw new Error("Raydium closePosition not implemented")
    }

    async openPosition(): Promise<any> {
        this.logger.warn("Raydium openPosition called but not implemented")
        throw new Error("Raydium openPosition not implemented")
    }
}


