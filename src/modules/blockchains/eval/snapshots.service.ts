import {
    BotSchema,
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    PriceService 
} from "../math"
import {
    AsyncService 
} from "@modules/mixin"
import {
    BalanceConfigNotFoundException, TokenNotFoundException 
} from "@exceptions"
import {
    TokenType 
} from "@modules/typedefs"
import {
    toDecimalAmount 
} from "@modules/utils"
import Decimal from "decimal.js"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

export interface EvalSnapshotParams {
    bot: BotSchema,
}


export interface EvalSnapshotResult {
    eligible: boolean,
}

@Injectable()
export class EvalSnapshotService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
    ) {}

    async eval(
        {
            bot,
        }: EvalSnapshotParams
    ): Promise<EvalSnapshotResult> {
        const snapshots = bot.balanceSnapshots
        if (!snapshots) {
            return {
                eligible: false,
            }
        }
        const targetBalanceAmount = new BN(snapshots.targetBalanceAmount)
        const quoteBalanceAmount = new BN(snapshots.quoteBalanceAmount)
        const gasBalanceAmount = new BN(snapshots.gasBalanceAmount)
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString(),
            },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString(),
            },
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native,
            },
            chainId: {
                $eq: bot.chainId,
            },
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    type: TokenType.Native,
                    chainId: bot.chainId,
                },
            })
        }
        const [
            targetPrice,
            quotePrice,
            gasPrice
        ] = await this.asyncService.allIgnoreError([
            this.priceService.resolvePrice({
                token: targetToken,
            }),
            this.priceService.resolvePrice({
                token: quoteToken,
            }),
            this.priceService.resolvePrice({
                token: gasToken,
            }),
        ])
        if (!targetPrice || !quotePrice || !gasPrice) {
            return {
                eligible: false,
            }
        }
        const targetBalanceAmountInUsd = toDecimalAmount({
            amount: targetBalanceAmount,
            decimals: new Decimal(targetToken.decimals),
        }).mul(targetPrice.price)
        const quoteBalanceAmountInUsd = toDecimalAmount({
            amount: quoteBalanceAmount,
            decimals: new Decimal(quoteToken.decimals),
        }).mul(quotePrice.price)
        const gasBalanceAmountInUsd = toDecimalAmount({
            amount: gasBalanceAmount,
            decimals: new Decimal(gasToken.decimals),
        }).mul(gasPrice.price)
        const totalBalanceAmountInUsd = targetBalanceAmountInUsd.add(quoteBalanceAmountInUsd).add(gasBalanceAmountInUsd)
        const minRequiredAmountInUsd = this.primaryMemoryStorageService.balanceConfig.balanceRequired?.[bot.chainId]?.minRequiredAmountInUsd
        if (!minRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException({
                chainId: bot.chainId,
            })
        }
        const eligible = totalBalanceAmountInUsd.gte(new Decimal(minRequiredAmountInUsd))
        this.winstonService.log(
            WinstonLog.EvalSnapshotsChecked,
            {
                botId: bot.id,
                totalBalanceAmountInUsd: totalBalanceAmountInUsd.toString(),
                minRequiredAmountInUsd: minRequiredAmountInUsd.toString(),
                eligible,
            }
        )
        return {
            eligible,
        }
    }
}