import {
    Injectable 
} from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResult, 
    FetchTokensParams,
    FetchTokensResult,
} from "../types"
import BN from "bn.js"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    CoinBalance,
} from "@mysten/sui/client"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    TokenNotFoundException 
} from "@modules/exceptions/errors"
import {
    Decimal 
} from "decimal.js"
import {
    toDecimalAmount 
} from "@modules/common"

/**
 * Service responsible for fetching Sui balance information.
 * Handles balance fetching for native SUI and other token types.
 *
 * @example
 * const service = new SuiBalanceFetcherService(...)
 * const balance = await service.fetchBalance({ bot, token })
 */
@Injectable()
export class SuiBalanceFetcherService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Fetches balance for a specific token on Sui.
     *
     * @param param - Parameters for fetching balance
     * @returns Balance amount for the token
     *
     * @example
     * const balance = await service.fetchBalance({ bot, token })
     */
    async fetchBalance({ bot, token }: FetchBalanceParams): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                // fetch coin balance from Sui client
                const { totalBalance } = await suiClient.getBalance({
                    owner: bot.accountAddress,
                    coinType: token.tokenAddress,
                })
                return {
                    balanceAmount: new BN(totalBalance.toString()),
                }
            },
        })
    }   

    /**
     * Fetches all tokens with balances for a bot on Sui.
     *
     * @param param - Parameters for fetching tokens
     * @returns Array of tokens with their balances
     *
     * @example
     * const tokens = await service.fetchTokens({ bot })
     */
    async fetchTokens({ bot }: FetchTokensParams): Promise<FetchTokensResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                // fetch all coin balances for owner
                const coins: Array<CoinBalance> = []
                const result = await suiClient.getAllBalances({
                    owner: bot.accountAddress,
                })
                coins.push(...result)
                
                // map coins to token balances
                return {
                    tokens: coins.map((coin) => {
                        // find token from storage by coin type
                        const token = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                            (t) => t.tokenAddress === coin.coinType,
                        )
                        if (!token) {
                            throw new TokenNotFoundException({
                                id: coin.coinType,
                            })
                        }
                        
                        // convert balance to decimal amount
                        return {
                            token,
                            balanceAmount: new BN(coin.totalBalance),
                            balanceAmountDecimal: toDecimalAmount({
                                amount: new BN(coin.totalBalance),
                                decimals: new Decimal(token.decimals),
                            }),
                        }
                    }),
                }
            },
        })
    }
}
