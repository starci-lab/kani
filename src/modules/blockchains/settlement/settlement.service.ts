import {
    Injectable 
} from "@nestjs/common"
import {
    OutOfRangeSettlementService 
} from "./out-of-range-settlement.service"
import {
    SettleParams 
} from "./settlement.interface"
import {
    PositionSettlementReason 
} from "@modules/databases"

@Injectable()
export class SettlementService {
    constructor(
        private readonly outOfRangeSettlementService: OutOfRangeSettlementService,
    ) {}

    async settle(
        { 
            bot, 
            state 
        }: SettleParams
    ): Promise<SettlementOutput> {
        // check if the position is out of range
        const isOutOfRange = await this.outOfRangeSettlementService.settle({
            bot, state 
        })
        if (isOutOfRange) {
            return {
                reason: PositionSettlementReason.OutOfRange,
                settled: true,
            }
        }
        return {
            settled: false,
        }
    }
}
    
export interface SettlementOutput {
    reason?: PositionSettlementReason
    settled: boolean
}