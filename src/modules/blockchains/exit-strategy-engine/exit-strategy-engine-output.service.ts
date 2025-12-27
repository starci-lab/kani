import { Injectable } from "@nestjs/common"
import { OutOfRangeStrategyEngineService } from "./out-of-range-strategy-engine.service"
import { ExitStrategyEngineReason, OutOfRangeExitCheckParams } from "./types"
import { AsyncService } from "@modules/mixin"

@Injectable()
export class ExitStrategyEngineOutputService {
    constructor(
        private readonly outOfRangeStrategyEngineService: OutOfRangeStrategyEngineService,
        private readonly asyncService: AsyncService,
    ) {}

    async willExit(
        { 
            bot, 
            state 
        }: OutOfRangeExitCheckParams
    ): Promise<ExitStrategyEngineOutput> {
        const reasons: Array<ExitStrategyEngineReason> = []
        const results = await this.asyncService.allIgnoreError([
            (async () => {
                const willExit = await this.outOfRangeStrategyEngineService.willExit({ bot, state })
                if (willExit) {
                    reasons.push(ExitStrategyEngineReason.OutOfRange)
                }
                return willExit
            })(),
        ])
        const willExit = results.some(result => result === true)
        return {
            reasons,
            willExit,
        }
    }
}

export interface ExitStrategyEngineOutput {
    reasons: Array<ExitStrategyEngineReason>
    willExit: boolean
}