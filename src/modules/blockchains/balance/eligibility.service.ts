import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { TokenNotFoundException } from "@exceptions"
import { TokenType } from "@typedefs"
import { computeDenomination } from "@utils"
import { AsyncService, DayjsService } from "@modules/mixin"
import { GetPriceResponse, PythPriceService } from "@modules/blockchains"
import BN from "bn.js"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"

/**
 * Params for balance eligibility check
 */
export interface IsSufficientParams {
    bot: BotSchema
}

@Injectable()
export class BalanceEligibilityService {
    constructor(
        // In-memory storage for tokens & configs
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,

        // Helper for running async calls in parallel with strict success
        private readonly asyncService: AsyncService,

        // Price oracle service (Pyth)
        private readonly pythPriceService: PythPriceService,

        // Time utility service
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Check whether a price snapshot is stale
     * (too old to be trusted for eligibility decision)
     */
    public isStalePrice(price: GetPriceResponse): boolean {
        const now = this.dayjsService.now()
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        const ageMs = now.diff(price.snapshotAt, "millisecond")
        return ageMs > maxAgeMs
    }

    /**
     * Check whether bot has sufficient total balance (target + quote + gas)
     * to be eligible for running/trading.
     *
     * Returns false on:
     * - missing snapshot balances
     * - missing token metadata
     * - stale prices
     * - insufficient total USD value
     * - any unexpected error
     */
    public async isSufficient({
        bot,
    }: IsSufficientParams): Promise<boolean> {
        try {
            // --- 1. Read snapshot balances from bot ---
            const snapshotTargetBalanceAmount = bot.snapshotTargetBalanceAmount
            const snapshotQuoteBalanceAmount = bot.snapshotQuoteBalanceAmount
            const snapshotGasBalanceAmount = bot.snapshotGasBalanceAmount

            // If any snapshot balance is missing → not eligible
            if (
                !snapshotTargetBalanceAmount ||
                !snapshotQuoteBalanceAmount ||
                !snapshotGasBalanceAmount
            ) {
                return false
            }

            // --- 2. Resolve token metadata ---
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

            // --- 3. Fetch prices in parallel ---
            const [
                targetPrice,
                quotePrice,
                gasPrice,
            ] = await this.asyncService.allMustDone([
                this.pythPriceService.getPrice({
                    tokenId: targetToken.displayId,
                }),
                this.pythPriceService.getPrice({
                    tokenId: quoteToken.displayId,
                }),
                this.pythPriceService.getPrice({
                    tokenId: gasToken.displayId,
                }),
            ])

            // Reject if any price is stale
            if (
                this.isStalePrice(targetPrice) ||
                this.isStalePrice(quotePrice) ||
                this.isStalePrice(gasPrice)
            ) {
                return false
            }

            // --- 4. Convert balances from raw units to decimals ---
            const targetBalanceAmountDecimal = computeDenomination(
                new BN(snapshotTargetBalanceAmount),
                targetToken.decimals,
            )
            const quoteBalanceAmountDecimal = computeDenomination(
                new BN(snapshotQuoteBalanceAmount),
                quoteToken.decimals,
            )
            const gasBalanceAmountDecimal = computeDenomination(
                new BN(snapshotGasBalanceAmount),
                gasToken.decimals,
            )

            // --- 5. Convert balances to USD ---
            const totalTargetBalanceAmountInUsd =
                targetBalanceAmountDecimal.mul(targetPrice.price)
            const totalQuoteBalanceAmountInUsd =
                quoteBalanceAmountDecimal.mul(quotePrice.price)
            const totalGasBalanceAmountInUsd =
                gasBalanceAmountDecimal.mul(gasPrice.price)
                
            const totalBalanceAmountInUsd =
                totalTargetBalanceAmountInUsd
                    .add(totalQuoteBalanceAmountInUsd)
                    .add(totalGasBalanceAmountInUsd)

            // --- 6. Compare against minimum required balance ---
            const minRequiredAmountInUsd = new Decimal(
                this.primaryMemoryStorageService.balanceConfig
                    .balanceRequired?.[bot.chainId]
                    ?.minRequiredAmountInUsd ?? 0,
            )

            if (totalBalanceAmountInUsd.lt(minRequiredAmountInUsd)) {
                return false
            }

            // All checks passed → eligible
            return true
        } catch {
            // Fail-safe: any error means not eligible
            return false
        }
    }
}