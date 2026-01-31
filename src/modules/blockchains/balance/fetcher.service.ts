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
} from "./balance.interface"
import {
    SolanaBalanceFetcherService 
} from "./solana/fetcher.service"
import {
    TokenType, ChainId 
} from "@modules/typedefs"
import {
    SuiBalanceFetcherService 
} from "./sui/fetcher.service"
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
} from "../types"
import BN from "bn.js"

@Injectable()
export class BalanceFetcherService {
    constructor(
        private readonly solanaBalanceFetcherService: SolanaBalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly suiBalanceFetcherService: SuiBalanceFetcherService,
        private readonly gasStatusService: GasStatusService,
    ) {
    }

    public async fetchBalances(
        {
            bot,
        }: FetchBalancesParams
    ): Promise<FetchBalancesResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            token: targetToken,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            token: quoteToken,
        })
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        const targetOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const minOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
        // we use the possible maximum amount of gas that can be used
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN,
                targetBalanceAmount,
            )
            if (effectiveGasAmountBN.lt(minOperationalGasAmountBN)) {
                throw new InsufficientMinGasBalanceAmountException(
                    {
                        gasBalanceAmount: effectiveGasAmountBN.toString(),
                        minOperationalGasAmount: minOperationalGasAmountBN.toString(),
                        chainId: bot.chainId,
                        botId: bot.id,
                    }
                )
            }
            const targetBalanceAmountAfterDeductingGas =
          targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(
                targetOperationalGasAmountBN,
            )
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
            }
        }
        default: {
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
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                token: gasToken,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            }
        }
        }
    }

    public async fetchBalance(
        params: FetchBalanceParams,
    ): Promise<FetchBalanceResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceFetcherService.fetchBalance(params)
        case ChainId.Sui:
            return this.suiBalanceFetcherService.fetchBalance(params)
        default:
            throw new UnsupportedChainIdException(
                params.bot.chainId,
            )
        }
    }

    public async fetchTokens(
        params: FetchTokensParams,
    ): Promise<FetchTokensResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceFetcherService.fetchTokens(params)
        case ChainId.Sui:
            return this.suiBalanceFetcherService.fetchTokens(params)
        default:
            throw new UnsupportedChainIdException(params.bot.chainId)
        }
    }
}
