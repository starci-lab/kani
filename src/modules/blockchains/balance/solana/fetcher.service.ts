import {
    Injectable 
} from "@nestjs/common"
import {
    TokenType 
} from "@modules/typedefs"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchTokensParams,
    FetchTokensResult,
} from "../balance.interface"
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

@Injectable()
export class SolanaBalanceFetcherService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) { }

    public async fetchBalance(
        {
            bot,
            token,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // return the native token balance
                if (token.type === TokenType.Native) {
                    const balance = await rpc.getBalance(address(bot.accountAddress)).send()
                    return {
                        balanceAmount: new BN(balance.value.toString()),
                    }
                }
                // return the token balance
                const mintAddress = address(token.tokenAddress)
                const ownerAddress = address(bot.accountAddress)
                // Derive the user's associated token account (ATA)
                // This is required because balances are stored in ATA, not in the owner wallet directly.
                const [
                    ataAddress
                ] = await findAssociatedTokenPda(
                    {
                        mint: mintAddress,
                        owner: ownerAddress,
                        tokenProgram:
                    token.is2022Token
                        ? TOKEN_2022_PROGRAM_ADDRESS
                        : TOKEN_PROGRAM_ADDRESS,
                    }
                )

                // Token-2022 accounts are handled by the newer token-2022 program.
                try {
                    if (token.is2022Token) {
                        const token2022 = await fetchToken2022(rpc,
                            ataAddress)
                        return {
                            balanceAmount: new BN(token2022.data.amount.toString()),
                        }
                    } else {
                        // Standard SPL token account
                        const tokenAccount = await fetchToken(rpc,
                            ataAddress)
                        return {
                            balanceAmount: new BN(tokenAccount.data.amount.toString()),
                        }
                    }
                } catch {
                    // we dont find the ata address, so the balance is 0
                    return {
                        balanceAmount: new BN(0),
                    }
                }
            },
        })
    }

    async fetchTokens(
        {
            bot,
        }: FetchTokensParams
    ): Promise<FetchTokensResult> {
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const tokenAccounts = await rpc.getTokenAccountsByOwner(
                    address(bot.accountAddress), 
                    {
                        programId: TOKEN_PROGRAM_ADDRESS,
                    }
                ).send()
                const token2022Accounts = await rpc.getTokenAccountsByOwner(
                    address(bot.accountAddress), 
                    {
                        programId: TOKEN_2022_PROGRAM_ADDRESS,
                    }
                ).send()
                console.log(
                    tokenAccounts,
                    token2022Accounts
                )
                return {
                    tokens: [],
                }
            },
        })
    }
}
