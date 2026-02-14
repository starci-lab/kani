import {
    Injectable 
} from "@nestjs/common"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchBalancesParams,
    FetchBalancesResult,
    FetchTokensParams,
    FetchTokensResult,
} from "./types"
import {
    SolanaBalanceFetcherService 
} from "./solana/fetcher.service"
import {
    TokenType, ChainId 
} from "@modules/common"
import {
    SuiBalanceFetcherService 
} from "./sui"
import { 
    PrimaryMemoryStorageService, 
} from "@modules/databases"
import {
    TokenNotFoundException,
    TargetOperationalGasAmountNotFoundException,
    MinOperationalGasAmountNotFoundException,
    InsufficientMinGasBalanceAmountException,
    UnsupportedChainIdException,
} from "@modules/exceptions"
import {
    GasStatusService 
} from "./gas-status.service"
import {
    GasStatus
} from "../enums"
import BN from "bn.js"
import {
    IBalanceFetcherService
} from "./types"
import {
    toRawAmount 
} from "@modules/common"
import Decimal from "decimal.js"

/**
 * Service responsible for fetching balance information from blockchain.
 * Handles balance fetching operations for both Solana and Sui chains.
 *
 * @example
 * const service = new BalanceFetcherService(...)
 * const balance = await service.fetchBalance({ bot, token })
 */
@Injectable()
export class BalanceFetcherService implements IBalanceFetcherService {
    constructor(
        private readonly solanaBalanceFetcherService: SolanaBalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiBalanceFetcherService: SuiBalanceFetcherService,
        private readonly gasStatusService: GasStatusService,
    ) {
    }

    /**
     * Fetches balances for target, quote, gas, and incentive tokens.
     *
     * @param param - Parameters for fetching balances
     * @returns Balance amounts for all token types
     *
     * @example
     * const balances = await service.fetchBalances({ bot, incentiveTokens })
     */
    public async fetchBalances(
        { 
            bot, 
            incentiveTokens 
        }: FetchBalancesParams
    ): Promise<FetchBalancesResult> {
        // find target token from storage
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.targetToken.toString()
                }
            }
        )
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        
        // find quote token from storage
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.quoteToken.toString()
                }
            }
        )
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        // fetch target and quote token balances
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            token: targetToken,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            token: quoteToken,
        })
        
        // fetch incentive token balances if provided
        const incentiveBalanceAmounts: Record<string, BN> = {
        }
        if (incentiveTokens) {
            for (const incentiveToken of incentiveTokens) {
                const { balanceAmount: incentiveBalanceAmount } = await this.fetchBalance({
                    bot,
                    token: incentiveToken,
                })
                incentiveBalanceAmounts[incentiveToken.id] = incentiveBalanceAmount
            }
        }
        
        // determine gas status based on token types
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        
        // get gas configuration for chain
        const { gasConfig: { gasAmountRequired } } = this.primaryMemoryStorageService
        const { targetOperationalAmount: targetOperationalGasAmount, minOperationalAmount: minOperationalGasAmount } = gasAmountRequired?.[bot.chainId] || {
        }
        
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException({
                chainId: bot.chainId,
            })
        }
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException({
                chainId: bot.chainId,
            })
        }
        
        // find native gas token for chain
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: bot.chainId
            }
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    chainId: bot.chainId,
                    type: TokenType.Native,
                },
            })
        }
        
        // convert gas amounts to BN
        const targetOperationalGasAmountBN = toRawAmount({
            amount: new Decimal(targetOperationalGasAmount),
            decimals: new Decimal(gasToken.decimals),
        })
        const minOperationalGasAmountBN = toRawAmount({
            amount: new Decimal(minOperationalGasAmount),
            decimals: new Decimal(gasToken.decimals),
        })
        // calculate balances based on gas status
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            // use maximum possible gas amount (min of required and available)
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN,
                targetBalanceAmount,
            )
            
            // validate minimum gas requirement
            if (effectiveGasAmountBN.lt(minOperationalGasAmountBN)) {
                throw new InsufficientMinGasBalanceAmountException({
                    gasBalanceAmount: effectiveGasAmountBN.toString(),
                    minOperationalGasAmount: minOperationalGasAmountBN.toString(),
                    chainId: bot.chainId,
                    botId: bot.id,
                })
            }
            
            // deduct gas from target balance
            const targetBalanceAmountAfterDeductingGas = targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
                incentiveBalanceAmounts,
            }
        }
        case GasStatus.IsQuote: {
            // deduct gas from quote balance
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(targetOperationalGasAmountBN)
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
                incentiveBalanceAmounts,
            }
        }
        default: {
            // fetch separate gas token balance
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                token: gasToken,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
                incentiveBalanceAmounts,
            }
        }
        }
    }

    /**
     * Fetches balance for a specific token.
     *
     * @param param - Parameters for fetching balance
     * @returns Balance amount for the token
     *
     * @example
     * const balance = await service.fetchBalance({ bot, token })
     */
    public async fetchBalance({ bot, token }: FetchBalanceParams): Promise<FetchBalanceResult> {
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceFetcherService.fetchBalance({
                bot, token 
            })
        case ChainId.Sui:
            return this.suiBalanceFetcherService.fetchBalance({
                bot, token 
            })
        default:
            throw new UnsupportedChainIdException({
                chainId: bot.chainId,
            })
        }
    }

    /**
     * Fetches all tokens with balances for a bot.
     *
     * @param param - Parameters for fetching tokens
     * @returns Array of tokens with their balances
     *
     * @example
     * const tokens = await service.fetchTokens({ bot })
     */
    public async fetchTokens({ bot }: FetchTokensParams): Promise<FetchTokensResult> {
        switch (bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceFetcherService.fetchTokens({
                bot 
            })
        case ChainId.Sui:
            return this.suiBalanceFetcherService.fetchTokens({
                bot 
            })
        default:
            throw new UnsupportedChainIdException(bot.chainId)
        }
    }
}
