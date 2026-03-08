import {
    BalanceConfigNotFoundException,
    MinOperationalGasAmountNotFoundException,
    TargetOperationalGasAmountNotFoundException,
    TokenNotFoundException 
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService,
    QuoteRatioStatus,
} from "@modules/databases"
import {
    MountStorageService,
} from "@modules/filesystem"
import {
    TokenType,
    toDecimalAmount 
} from "@modules/common"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    BalanceConvertService,
} from "../balance"
import {
    PriceService,
    QuoteRatioService 
} from "../math"
import {
    EvalBalanceParams,
    EvalBalanceResult
} from "./types"
import {
    BalanceEvalStatus
} from "./enums"

/**
 * Service responsible for evaluating bot balance and determining operational status.
 * Checks funding requirements, gas thresholds, and quote ratio balance.
 *
 * @example
 * const service = new EvalBalanceService(...)
 * const result = await service.eval({ bot })
 */
@Injectable()
export class EvalBalanceService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly mountStorageService: MountStorageService,
        private readonly balanceConvertService: BalanceConvertService,
        private readonly priceService: PriceService,
        private readonly quoteRatioService: QuoteRatioService,
    ) {}

    /**
     * Evaluates bot balance and determines operational status.
     * Checks funding requirements, gas thresholds, and quote ratio balance.
     *
     * @param param - Parameters for evaluating balance
     * @param param.bot - Bot schema with balance snapshots
     * @returns Evaluation result with funding snapshots and status
     * @throws {BalanceConfigNotFoundException} If balance configuration is missing for the chain
     * @throws {MinOperationalGasAmountNotFoundException} If minimum operational gas amount is not configured
     * @throws {TargetOperationalGasAmountNotFoundException} If target operational gas amount is not configured
     * @throws {TokenNotFoundException} If target, quote, or gas token metadata is not found
     */
    async eval(
        { bot }: EvalBalanceParams
    ): Promise<EvalBalanceResult> {
        // Stage: config validation (minimum funding requirement must be configured)
        const minRequiredAmountInUsd = this.mountStorageService.appConfig.balance
            .balanceRequired?.[bot.chainId]?.minRequiredAmountInUsd
        if (!minRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException({
                chainId: bot.chainId,
            })
        }

        // Stage: config validation (gas thresholds must be configured)
        // Gas thresholds are configured in human units (e.g. SUI, SOL),
        // so we compare them against the decimal-converted gas balance.
        const minOperationalGasAmount = this.mountStorageService.appConfig.gas
            .gasAmountRequired?.[bot.chainId]?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException({
                chainId: bot.chainId,
            })
        }

        const targetOperationalGasAmount = this.mountStorageService.appConfig.gas
            .gasAmountRequired?.[bot.chainId]?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException({
                chainId: bot.chainId,
            })
        }

        // Resolve token metadata
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

        const targetBalanceAmountRaw = new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0")
        const quoteBalanceAmountRaw = new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0")
        const gasBalanceAmountRaw = new BN(bot.balanceSnapshots?.gasBalanceAmount ?? "0")

        // Convert all balances to target token via BalanceConvertService
        const {
            targetAmountInTarget,
            quoteAmountInTarget,
            gasAmountInTarget,
        } = await this.balanceConvertService.convertToTarget({
            bot,
        })

        // Funding snapshots in target token
        const fundingSnapshotExcludingGas = targetAmountInTarget.add(quoteAmountInTarget)
        const fundingSnapshotIncludingGas = fundingSnapshotExcludingGas.add(gasAmountInTarget)

        // USD snapshots: total in target × target price
        const { price: targetPrice } = await this.priceService.resolvePrice({
            token: targetToken,
        })
        const fundingSnapshotInUsdExcludingGas = fundingSnapshotExcludingGas.mul(targetPrice)
        const fundingSnapshotInUsdIncludingGas = fundingSnapshotIncludingGas.mul(targetPrice)

        // Gas balance in own units (for min operational threshold check)
        const gasBalanceAmount = toDecimalAmount({
            amount: gasBalanceAmountRaw,
            decimals: new Decimal(gasToken.decimals),
        })

        // Determine status based on priority checks
        let status = BalanceEvalStatus.Ok

        // Priority 1: Check if bot is in a position
        if (bot.activePosition) {
            status = BalanceEvalStatus.InPosition
        // Priority 2: Check if non-gas funding is below minimum USD requirement
        } else if (fundingSnapshotInUsdExcludingGas.lt(new Decimal(minRequiredAmountInUsd ?? 0))) {
            status = BalanceEvalStatus.InsufficientFunding
        // Priority 3: Check if gas balance is below minimum operational requirement
        } else if (gasBalanceAmount.lt(new Decimal(minOperationalGasAmount))) {
            status = BalanceEvalStatus.InsufficientGas
        // Priority 4: Evaluate quote ratio imbalance status
        } else {
            const { quoteRatio } = await this.quoteRatioService.computeQuoteRatio({
                targetToken,
                quoteToken,
                targetBalanceAmount: targetBalanceAmountRaw,
                quoteBalanceAmount: quoteBalanceAmountRaw,
            })
            const quoteRatioStatus = this.quoteRatioService.checkQuoteRatioStatus({
                quoteRatio,
            })
            if (quoteRatioStatus === QuoteRatioStatus.TargetUnderweighted) {
                status = BalanceEvalStatus.TargetUnderweighted
            } else if (quoteRatioStatus === QuoteRatioStatus.TargetOverweighted) {
                status = BalanceEvalStatus.TargetOverweighted
            }
        }

        return {
            fundingSnapshot: {
                excludingGas: fundingSnapshotExcludingGas,
                includingGas: fundingSnapshotIncludingGas,
            },
            fundingSnapshotInUsd: {
                excludingGas: fundingSnapshotInUsdExcludingGas,
                includingGas: fundingSnapshotInUsdIncludingGas,
            },
            status,
        }
    }
}