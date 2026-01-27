import {
    BalanceConfigNotFoundException,
    TokenNotFoundException 
} from "@exceptions"
import {
    BotSchema,
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    TokenType 
} from "@modules/typedefs"
import {
    toDecimalAmount 
} from "@modules/utils"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { 
    PriceService 
} from "@modules/blockchains"

export interface EvalBalanceParams {
    bot: BotSchema,
}

export interface FundingSnapshot {
    excludingGas: number
    includingGas: number
}

export enum BalanceEvalStatus {
    Ok = "ok",
    InsufficientCapital = "insufficientCapital",
    InsufficientGas = "insufficientGas",
    TargetUnderweighted = "targetUnderweighted",
    TargetOverweighted  = "targetOverweighted",
}

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
    ) {}

    async eval(
        {
            bot,
        }: EvalBalanceParams
    ): Promise<EvalBalanceResult> {
        const minRequiredAmountInUsd = this.primaryMemoryStorageService.balanceConfig.balanceRequired?.[bot.chainId]?.minRequiredAmountInUsd
        if (!minRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException({
            })
        }
        const maxRequiredAmountInUsd = this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]?.minOperationalAmount
        if (!maxRequiredAmountInUsd) {
            throw new BalanceConfigNotFoundException({
            })
        }

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
        const targetBalanceAmount = toDecimalAmount({
            amount: new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0"),
            decimals: new Decimal(targetToken.decimals),
        })
        const targetBalanceAmountInUsd = targetBalanceAmount.mul(targetPrice)
        const quoteBalanceAmount = toDecimalAmount({
            amount: new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0"),
            decimals: new Decimal(quoteToken.decimals),
        })
        const quoteBalanceAmountInTarget = quoteBalanceAmount.div(quotePrice).mul(targetPrice)
        const quoteBalanceAmountInUsd = quoteBalanceAmount.mul(quotePrice)
        const gasBalanceAmount = toDecimalAmount({
            amount: new BN(bot.balanceSnapshots?.gasBalanceAmount ?? "0"),
            decimals: new Decimal(gasToken.decimals),
        })
        const gasBalanceAmountInTarget = gasBalanceAmount.div(gasPrice).mul(targetPrice)
        const gasBalanceAmountInUsd = gasBalanceAmount.mul(gasPrice)
        const fundingSnapshotExcludingGas = targetBalanceAmount.add(quoteBalanceAmountInTarget)
        const fundingSnapshotIncludingGas = fundingSnapshotExcludingGas.add(gasBalanceAmountInTarget)
        const fundingSnapshotInUsdExcludingGas = targetBalanceAmountInUsd.add(quoteBalanceAmountInUsd)
        const fundingSnapshotInUsdIncludingGas = fundingSnapshotInUsdExcludingGas.add(gasBalanceAmountInUsd)
        let status = BalanceEvalStatus.Ok
        if (fundingSnapshotInUsdExcludingGas.lt(new Decimal(minRequiredAmountInUsd ?? 0))) {
            status = BalanceEvalStatus.InsufficientCapital
        } else if (gasBalanceAmountInUsd.gt(new Decimal(minRequiredAmountInUsd ?? 0))) {
            status = BalanceEvalStatus.TargetOverweighted
        }
        return {
            fundingSnapsot: {
                excludingGas: fundingSnapshotExcludingGas.toNumber(),
                includingGas: fundingSnapshotIncludingGas.toNumber()
            },
            fundingSnapshotInUsd: {
                excludingGas: fundingSnapshotInUsdExcludingGas.toNumber(),
                includingGas: fundingSnapshotInUsdIncludingGas.toNumber(),
            },
            status: BalanceEvalStatus.Ok
        }
    }
}