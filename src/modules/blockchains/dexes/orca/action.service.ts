import { Injectable, Logger } from "@nestjs/common"
import { IActionService } from "../../interfaces"

@Injectable()
export class OrcaActionService implements IActionService {
    private readonly logger = new Logger(OrcaActionService.name)

    async swap(): Promise<any> {
        this.logger.warn("Orca swap called but not implemented")
        throw new Error("Orca swap not implemented")
    }

    async closePosition(): Promise<any> {
        this.logger.warn("Orca closePosition called but not implemented")
        throw new Error("Orca closePosition not implemented")
    }

    async openPosition(): Promise<any> {
        this.logger.warn("Orca openPosition called but not implemented")
        throw new Error("Orca openPosition not implemented")
    }
}


