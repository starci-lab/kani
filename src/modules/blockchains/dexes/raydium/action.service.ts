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
}


