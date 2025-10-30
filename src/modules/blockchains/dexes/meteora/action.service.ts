import { Injectable, Logger } from "@nestjs/common"
import { IActionService } from "../../interfaces"

@Injectable()
export class MeteoraActionService implements IActionService {
    private readonly logger = new Logger(MeteoraActionService.name)

    async swap(): Promise<any> {
        this.logger.warn("Meteora swap called but not implemented")
        throw new Error("Meteora swap not implemented")
    }
}


