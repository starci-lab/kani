import {
    Injectable 
} from "@nestjs/common"
import {
    TokenType 
} from "../../enums"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchTokensParams,
    FetchTokensResult,
} from "../types"
import BN from "bn.js"
import {
    address,
} from "@solana/kit"
import { 
    findAssociatedTokenPda, 
    TOKEN_PROGRAM_ADDRESS, 
} from "@solana-program/token"
import {
    fetchToken as fetchToken2022,
    TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022"
import {
    fetchToken 
} from "@solana-program/token"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"

/**
 * Service responsible for fetching Solana balance information.
 * Handles balance fetching for native SOL and SPL tokens.
 *
 * @example
 * const service = new SolanaBalanceFetcherService(...)
 * const balance = await service.fetchBalance({ bot, token })
 */
@Injectable()
export class SolanaBalanceFetcherService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) { }

    /**
     * Fetches balance for a specific token on Solana.
     *
     * @param param - Parameters for fetching balance
     * @returns Balance amount for the token
     *
     * @example
     * const balance = await service.fetchBalance({ bot, token })
     */
    public async fetchBalance({ bot, token }: FetchBalanceParams): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // handle native SOL balance
                if (token.type === TokenType.Native) {
                    const balance = await rpc.getBalance(address(bot.accountAddress)).send()
                    return {
                        balanceAmount: new BN(balance.value.toString()),
                    }
                }
                
                // derive associated token account (ATA) address
                const mintAddress = address(token.tokenAddress)
                const ownerAddress = address(bot.accountAddress)
                const [ataAddress] = await findAssociatedTokenPda({
                    mint: mintAddress,
                    owner: ownerAddress,
                    tokenProgram: token.is2022Token
                        ? TOKEN_2022_PROGRAM_ADDRESS
                        : TOKEN_PROGRAM_ADDRESS,
                })

                // fetch token balance from ATA
                try {
                    if (token.is2022Token) {
                        // use token-2022 program for newer tokens
                        const token2022 = await fetchToken2022(
                            rpc,
                            ataAddress
                        )
                        return {
                            balanceAmount: new BN(token2022.data.amount.toString()),
                        }
                    } else {
                        // use standard SPL token program
                        const tokenAccount = await fetchToken(
                            rpc,
                            ataAddress
                        )
                        return {
                            balanceAmount: new BN(tokenAccount.data.amount.toString()),
                        }
                    }
                } catch {
                    // ATA not found, balance is zero
                    return {
                        balanceAmount: new BN(0),
                    }
                }
            },
        })
    }

    /**
     * Fetches all tokens with balances for a bot on Solana.
     *
     * @param param - Parameters for fetching tokens
     * @returns Array of tokens with their balances
     *
     * @example
     * const tokens = await service.fetchTokens({ bot })
     */
    async fetchTokens({ bot }: FetchTokensParams): Promise<FetchTokensResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // fetch token accounts from standard token program
                await rpc.getTokenAccountsByOwner(
                    address(bot.accountAddress), 
                    {
                        programId: TOKEN_PROGRAM_ADDRESS,
                    }
                ).send()
                
                // fetch token accounts from token-2022 program
                await rpc.getTokenAccountsByOwner(
                    address(bot.accountAddress), 
                    {
                        programId: TOKEN_2022_PROGRAM_ADDRESS,
                    }
                ).send()
                
                // TODO: implement token mapping and balance calculation
                return {
                    tokens: [],
                }
            },
        })
    }
}
