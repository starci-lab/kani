import { Injectable, Logger } from "@nestjs/common"
import { IActionService } from "../../interfaces"

@Injectable()
export class OrcaActionService implements IActionService {
    private readonly logger = new Logger(OrcaActionService.name)

    async swap(): Promise<any> {
        this.logger.warn("Orca swap called but not implemented")
        throw new Error("Orca swap not implemented")
    }
}


