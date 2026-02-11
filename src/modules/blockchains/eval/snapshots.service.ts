import {
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
    BalanceConfigNotFoundException,
    TokenNotFoundException 
} from "@modules/exceptions"
import {
    TokenType,
    toDecimalAmount
} from "@modules/common"
import Decimal from "decimal.js"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    EvalSnapshotParams,
    EvalSnapshotResult
} from "./types"

/**
 * Service responsible for evaluating balance snapshots eligibility.
 * Checks if a bot's balance snapshots meet the minimum required funding threshold.
 *
 * @example
 * const service = new EvalSnapshotService(...)
 * const result = await service.eval({ bot })
 */
@Injectable()
export class EvalSnapshotService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Evaluates balance snapshots eligibility by checking if total balance meets minimum requirements.
     *
     * @param param - Parameters for evaluating snapshots
     * @param param.bot - Bot schema with balance snapshots
     * @returns Evaluation result indicating if bot is eligible
     * @throws {TokenNotFoundException} If target, quote, or gas token metadata is not found
     * @throws {BalanceConfigNotFoundException} If balance configuration is missing for the chain
     */
    async eval({ bot }: EvalSnapshotParams): Promise<EvalSnapshotResult> {
        // Stage: state validation (balance snapshots must exist)
        const snapshots = bot.balanceSnapshots
        if (!snapshots) {
            return {
                eligible: false,
            }
        }
        // Extract balance amounts from snapshots
        const {
            targetBalanceAmount: targetBalanceAmountStr,
            quoteBalanceAmount: quoteBalanceAmountStr,
            gasBalanceAmount: gasBalanceAmountStr
        } = snapshots
        const targetBalanceAmount = new BN(targetBalanceAmountStr)
        const quoteBalanceAmount = new BN(quoteBalanceAmountStr)
        const gasBalanceAmount = new BN(gasBalanceAmountStr)

        // Fetch token metadata
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

        // Resolve token prices in parallel
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

        // Stage: price validation (all prices must be available)
        if (!targetPrice || !quotePrice || !gasPrice) {
            return {
                eligible: false,
            }
        }

        // Convert balances to USD
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

        // Calculate total balance in USD
        const totalBalanceAmountInUsd = targetBalanceAmountInUsd
            .add(quoteBalanceAmountInUsd)
            .add(gasBalanceAmountInUsd)

        // Fetch minimum required amount from config
        const minRequiredAmountInUsd = this.primaryMemoryStorageService.balanceConfig
            .balanceRequired?.[bot.chainId]?.minRequiredAmountInUsd

        // Stage: config validation (minimum required amount must be configured)
        if (!minRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException({
                chainId: bot.chainId,
            })
        }

        // Check eligibility
        const eligible = totalBalanceAmountInUsd.gte(new Decimal(minRequiredAmountInUsd))

        // Log evaluation result
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