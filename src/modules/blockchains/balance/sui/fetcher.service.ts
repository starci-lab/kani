import {
    Injectable 
} from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResult, 
    FetchTokensParams,
    FetchTokensResult,
} from "../balance.interface"
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
} from "@modules/exceptions/classes"
import {
    Decimal 
} from "decimal.js"
import {
    toDecimalAmount 
} from "@modules/utils"

@Injectable()
export class SuiBalanceFetcherService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async fetchBalance(
        {
            bot,
            token,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
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

    async fetchTokens(
        {
            bot,
        }: FetchTokensParams
    ): Promise<FetchTokensResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                const coins: Array<CoinBalance> = []
                const result = await suiClient.getAllBalances({
                    owner: bot.accountAddress,
                })
                coins.push(...result)
                return {
                    tokens: coins.map((coin) => {
                        const token = this.primaryMemoryStorageService.tokenCollection.findOne(
                            {
                                tokenAddress: {
                                    $eq: coin.coinType,
                                },
                            }
                        )
                        if (!token) {
                            throw new TokenNotFoundException({
                                id: coin.coinType,
                            })
                        }
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
