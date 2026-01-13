import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import {
    MinOperationalGasAmountNotFoundException,
    TokenNotFoundException,
} from "@exceptions"
import { TokenType } from "@typedefs"
import { computeDenomination, createEnumType } from "@utils"
import { AsyncService, DayjsService } from "@modules/mixin"
import { GetPriceResponse, PythPriceService } from "@modules/blockchains"
import BN from "bn.js"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"
import { registerEnumType } from "@nestjs/graphql"

/**
 * Params for balance eligibility evaluation
 */
export interface EvaluateBalanceEligibilityParams {
    bot: BotSchema
}

@Injectable()
export class BalanceEligibilityService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly pythPriceService: PythPriceService,
        private readonly dayjsService: DayjsService,
    ) { }

    /**
     * Check whether a price snapshot is stale
     */
    public isStalePrice(price: GetPriceResponse): boolean {
        const now = this.dayjsService.now()
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        const ageMs = now.diff(price.snapshotAt, "millisecond")
        return ageMs > maxAgeMs
    }

    /**
     * Evaluate whether a bot has sufficient balance and gas to operate.
     * Returns eligibility result with detailed failure reason.
     */
    public async evaluateBalanceEligibility({
        bot,
    }: EvaluateBalanceEligibilityParams): Promise<BalanceEligibilityResult> {
        try {
            // --- 1. Read snapshot balances ---
            const {
                snapshotTargetBalanceAmount,
                snapshotQuoteBalanceAmount,
                snapshotGasBalanceAmount,
                lastBalancesSnapshotAt,
            } = bot
            /**
         * Snapshot validity check:
         * - All snapshot balances must exist
         * - Snapshot must be recent enough
         */
            if (
                !lastBalancesSnapshotAt ||
                new Decimal(
                    this.dayjsService.now().diff(lastBalancesSnapshotAt, "millisecond"),
                ).gt(
                    new Decimal(
                        envConfig().timeConfig.interval.balanceSnapshot,
                    ),
                )
            ) {
                return {
                    isEligible: false,
                    status: BalanceEligibilityStatus.StaleSnapshot,
                }
            }
            // --- 2. Resolve tokens ---
            const targetToken = this.primaryMemoryStorageService.tokens.find(
                (token) => token.id === bot.targetToken.toString(),
            )
            if (!targetToken) {
                throw new TokenNotFoundException("Target token not found")
            }

            const quoteToken = this.primaryMemoryStorageService.tokens.find(
                (token) => token.id === bot.quoteToken.toString(),
            )
            if (!quoteToken) {
                throw new TokenNotFoundException("Quote token not found")
            }

            const gasToken = this.primaryMemoryStorageService.tokens.find(
                (token) =>
                    token.type === TokenType.Native &&
                    token.chainId === bot.chainId,
            )
            if (!gasToken) {
                throw new TokenNotFoundException("Gas token not found")
            }
            // --- 3. Fetch prices ---
            const [
                targetPrice,
                quotePrice,
                gasPrice
            ] =
                await this.asyncService.allMustDone([
                    this.pythPriceService.getPrice({
                        tokenId: targetToken.displayId,
                    }),
                    this.pythPriceService.getPrice({
                        tokenId: quoteToken.displayId,
                    }),
                    this.pythPriceService.getPrice({
                        tokenId: gasToken.displayId,
                    }),
                ]
                )
            if (
                this.isStalePrice(targetPrice) ||
                this.isStalePrice(quotePrice) ||
                this.isStalePrice(gasPrice)
            ) {
                return {
                    isEligible: false,
                    status: BalanceEligibilityStatus.StalePrice,
                }
            }
            // --- 4. Convert balances ---
            const targetBalance = computeDenomination(
                new BN(snapshotTargetBalanceAmount),
                targetToken.decimals,
            )
            const quoteBalance = computeDenomination(
                new BN(snapshotQuoteBalanceAmount),
                quoteToken.decimals,
            )
            const gasBalance = computeDenomination(
                new BN(snapshotGasBalanceAmount),
                gasToken.decimals,
            )
            // --- 5. Compute balances in USDC ---
            const balanceExcludingGasInUsdc = targetBalance
                .mul(targetPrice.price)
                .add(quoteBalance.mul(quotePrice.price))

            const balanceIncludingGasInUsdc = balanceExcludingGasInUsdc.add(
                gasBalance.mul(gasPrice.price),
            )

            // --- 6. Check minimum required balance ---
            const minRequiredAmountInUsd = new Decimal(
                this.primaryMemoryStorageService.balanceConfig
                    .balanceRequired?.[bot.chainId]
                    ?.minRequiredAmountInUsd ?? 0,
            )

            if (balanceExcludingGasInUsdc.lt(minRequiredAmountInUsd)) {
                return {
                    isEligible: false,
                    status: BalanceEligibilityStatus.InsufficientFunds,
                    balanceExcludingGasInUsdc,
                    balanceIncludingGasInUsdc,
                }
            }
            // --- 7. Check gas sufficiency ---
            const minOperationalGasAmount =
                this.primaryMemoryStorageService.gasConfig
                    .gasAmountRequired?.[bot.chainId]
                    ?.minOperationalAmount

            if (!minOperationalGasAmount) {
                throw new MinOperationalGasAmountNotFoundException(
                    bot.chainId,
                    "Min operational gas amount not found",
                )
            }
            const minOperationalGasAmountDecimal = computeDenomination(
                new BN(minOperationalGasAmount),
                gasToken.decimals,
            )
            if (gasBalance.lt(minOperationalGasAmountDecimal)) {
                return {
                    isEligible: false,
                    status: BalanceEligibilityStatus.NotEnoughGas,
                    balanceExcludingGasInUsdc,
                    balanceIncludingGasInUsdc,
                }
            }

            // --- Eligible ---
            return {
                isEligible: true,
                status: BalanceEligibilityStatus.Ok,
                balanceExcludingGasInUsdc,
                balanceIncludingGasInUsdc,
            }
        } catch (error) {
            console.error(error)
            return {
                isEligible: false,
                status: BalanceEligibilityStatus.Error,
            }
        }
    }
}

/**
 * Result returned by balance eligibility evaluation
 */
export interface BalanceEligibilityResult {
    isEligible: boolean
    balanceExcludingGasInUsdc?: Decimal
    balanceIncludingGasInUsdc?: Decimal
    status: BalanceEligibilityStatus
}

export enum BalanceEligibilityStatus {
    Ok = "ok",
    StalePrice = "stalePrice",
    StaleSnapshot = "staleSnapshot",
    NotEnoughGas = "notEnoughGas",
    InsufficientFunds = "insufficientFunds",
    Error = "error",
}

export const GraphQLTypeBalanceEligibilityStatus =
    createEnumType(BalanceEligibilityStatus)

registerEnumType(GraphQLTypeBalanceEligibilityStatus, {
    name: "BalanceEligibilityStatus",
    description:
        "Eligibility status of the bot based on balance, gas, and price snapshot.",
    valuesMap: {
        [BalanceEligibilityStatus.Ok]: {
            description: "The bot is eligible to operate.",
        },
        [BalanceEligibilityStatus.StalePrice]: {
            description: "One or more price snapshots are stale.",
        },
        [BalanceEligibilityStatus.NotEnoughGas]: {
            description: "Gas balance is below the minimum operational requirement.",
        },
        [BalanceEligibilityStatus.InsufficientFunds]: {
            description: "Total balance excluding gas is insufficient.",
        },
        [BalanceEligibilityStatus.Error]: {
            description: "An unexpected error occurred during evaluation.",
        },
    },
})
