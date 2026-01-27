import {
    BalanceConfigNotFoundException,
    MinOperationalGasAmountNotFoundException,
    TargetOperationalGasAmountNotFoundException,
    TokenNotFoundException 
} from "@exceptions"
import {
    BotSchema,
    PrimaryMemoryStorageService, 
    QuoteRatioStatus
} from "@modules/databases"
import {
    TokenType 
} from "@modules/typedefs"
import {
    createEnumType,
    toDecimalAmount 
} from "@modules/utils"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { 
    PriceService,
    QuoteRatioService 
} from "@modules/blockchains"
import {
    registerEnumType 
} from "@nestjs/graphql"

export interface EvalBalanceParams {
    bot: BotSchema,
}

export interface FundingSnapshot {
    excludingGas: Decimal
    includingGas: Decimal
}   

export enum BalanceEvalStatus {
    Ok = "ok",
    InPosition  = "inPosition",
    InsufficientFunding = "insufficientFunding",
    InsufficientGas = "insufficientGas",
    TargetUnderweighted = "targetUnderweighted",
    TargetOverweighted  = "targetOverweighted",
}

export const GraphQLTypeBalanceEvalStatus = createEnumType(
    BalanceEvalStatus,
)
registerEnumType(
    GraphQLTypeBalanceEvalStatus,
    {
        name: "BalanceEvalStatus",
        description:
            "Balance evaluation status returned by EvalBalanceService.",
        valuesMap: {
            [BalanceEvalStatus.Ok]: {
                description: "The balance is sufficient",
            },
            [BalanceEvalStatus.InPosition]: {
                description: "The bot is in a position",
            },
            [BalanceEvalStatus.InsufficientFunding]: {
                description: "The balance is insufficient",
            },
            [BalanceEvalStatus.InsufficientGas]: {
                description: "The gas is insufficient",
            },
            [BalanceEvalStatus.TargetUnderweighted]: {
                description: "The target is underweighted",
            },
            [BalanceEvalStatus.TargetOverweighted]: {
                description: "The target is overweighted",
            },
        }
    }
)


export interface EvalBalanceResult {
    // in target token
    fundingSnapsot: FundingSnapshot,
    // in usd
    fundingSnapshotInUsd: FundingSnapshot,
    // eligibility status
    status: BalanceEvalStatus,
}

@Injectable()
export class EvalBalanceService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly quoteRatioService: QuoteRatioService,
    ) {}

    async eval(
        {
            bot,
        }: EvalBalanceParams
    ): Promise<EvalBalanceResult> {
        // Minimum overall funding requirement (USD) to be eligible to operate.
        const minRequiredAmountInUsd = this.primaryMemoryStorageService.balanceConfig.balanceRequired?.[bot.chainId]?.minRequiredAmountInUsd
        if (!minRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }

        // Gas thresholds are configured in human units (e.g. SUI, SOL),
        // so we compare them against the decimal-converted gas balance.
        const minOperationalGasAmount = this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const targetOperationalGasAmount = this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }

        // Resolve token metadata + prices.
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
        const { price: targetPrice } = await this.priceService.resolvePrice({
            token: targetToken,
        })
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
        const { price: quotePrice } = await this.priceService.resolvePrice({
            token: quoteToken,
        })
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
        const { price: gasPrice } = await this.priceService.resolvePrice({
            token: gasToken,
        })

        // Convert raw balances (integer strings) to decimal amounts using token decimals.
        const targetBalanceAmountRaw = new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0")
        const targetBalanceAmount = toDecimalAmount({
            amount: targetBalanceAmountRaw,
            decimals: new Decimal(targetToken.decimals),
        })
        const targetBalanceAmountInUsd = targetBalanceAmount.mul(targetPrice)
        const quoteBalanceAmountRaw = new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0")
        const quoteBalanceAmount = toDecimalAmount({
            amount: quoteBalanceAmountRaw,
            decimals: new Decimal(quoteToken.decimals),
        })
        const quoteBalanceAmountInTarget = quoteBalanceAmount.div(quotePrice).mul(targetPrice)
        const quoteBalanceAmountInUsd = quoteBalanceAmount.mul(quotePrice)
        const gasBalanceAmountRaw = new BN(bot.balanceSnapshots?.gasBalanceAmount ?? "0")
        const gasBalanceAmount = toDecimalAmount({
            amount: gasBalanceAmountRaw,
            decimals: new Decimal(gasToken.decimals),
        })
        const gasBalanceAmountInTarget = gasBalanceAmount.div(gasPrice).mul(targetPrice)
        const gasBalanceAmountInUsd = gasBalanceAmount.mul(gasPrice)
        const fundingSnapshotExcludingGas = targetBalanceAmount.add(quoteBalanceAmountInTarget)
        const fundingSnapshotIncludingGas = fundingSnapshotExcludingGas.add(gasBalanceAmountInTarget)
        const fundingSnapshotInUsdExcludingGas = targetBalanceAmountInUsd.add(quoteBalanceAmountInUsd)
        const fundingSnapshotInUsdIncludingGas = fundingSnapshotInUsdExcludingGas.add(gasBalanceAmountInUsd)
        let status = BalanceEvalStatus.Ok
        // Priority checks:
        // 1) If the bot is in a position => in position.
        if (bot.activePosition) {
            status = BalanceEvalStatus.InPosition
        // 2) If non-gas funding is below minimum USD requirement => insufficient funding.
        } else if (fundingSnapshotInUsdExcludingGas.lt(new Decimal(minRequiredAmountInUsd ?? 0))) {
            status = BalanceEvalStatus.InsufficientFunding
        // 3) If gas balance is below minimum operational requirement => insufficient gas.
        } else if (gasBalanceAmount.lt(new Decimal(minOperationalGasAmount))) {
            status = BalanceEvalStatus.InsufficientGas
        // 4) Funding is sufficient and gas is OK => evaluate quote ratio imbalance status.
        } else {
            const { quoteRatio } = await this.quoteRatioService.computeQuoteRatio({
                targetToken,
                quoteToken,
                targetBalanceAmount: targetBalanceAmountRaw,
                quoteBalanceAmount: quoteBalanceAmountRaw,
            })
            const _status = this.quoteRatioService.checkQuoteRatioStatus({
                quoteRatio,
            })
            if (_status === QuoteRatioStatus.TargetUnderweighted) {
                status = BalanceEvalStatus.TargetUnderweighted
            } else if (_status === QuoteRatioStatus.TargetOverweighted) {
                status = BalanceEvalStatus.TargetOverweighted
            }
        }
        return {
            fundingSnapsot: {
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