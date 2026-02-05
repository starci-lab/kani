import {
    Injectable,
} from "@nestjs/common"
import {
    AddWithdrawJobRequestDto,
} from "./add-withdraw-job.dto"
import {
    CacheService,
    CacheKey,
} from "@modules/cache"
import BN from "bn.js"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@Injectable()
export class AddWithdrawJobService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly winstonService: WinstonService,
    ) {}

    async addWithdrawJob(
        {
            tokenInputs,
            toUsdc = false,
            id,
        }: AddWithdrawJobRequestDto,
    ): Promise<void> {
        // Cache the token inputs
        await this.cacheService.set(
            {
                key: CacheKey.Withdraw,
                args: [id],
                cacheResult: {
                    toUsdc,
                    tokenInputs: tokenInputs.map((tokenInput) => ({
                        tokenId: tokenInput.id,
                        amount: new BN(tokenInput.amount),
                    })),
                },
            }
        )
        this.winstonService.log(
            WinstonLog.WithdrawJobScheduled,
            {
                botId: id,
                tokenInputs: tokenInputs.map((t) => ({
                    id: t.id,
                    amount: t.amount,
                })),
                toUsdc,
            }
        )
    }
}
