import {
    Injectable
} from "@nestjs/common"
import {
    address,
    EncodedAccount,
    fetchEncodedAccount,
    signature,
} from "@solana/kit"
import {
    RpcExecutorService
} from "../rpc"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    SolanaAccountNotFoundException
} from "@modules/exceptions"
import {
    AsyncService
} from "@modules/mixin"
import type {
    FetchSolanaAccountParams,
    FetchSolanaTransactionParams,
} from "./types"

/**
 * Service for fetching Solana accounts and transactions.
 * Throws if account does not exist; returns encoded account.
 * Returns null if transaction is not found or failed.
 *
 * @example
 * const account = await solanaFetchService.fetchAccount({
 *   address: positionId,
 *   kind: AccountKind.PersonalPosition,
 *   dexId: DexId.Meteora,
 *   liquidityPoolId: liquidityPool.displayId,
 * })
 */
@Injectable()
export class SolanaFetchService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Fetches a Solana account. Throws if not found.
     *
     * @returns Encoded account (caller can decode with layout/decoder). Exists is true when returned.
     */
    async fetchAccount({
        address: accountAddress,
        kind,
        dexId,
        liquidityPoolId,
    }: FetchSolanaAccountParams): Promise<EncodedAccount> {
        const accountInfo = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await fetchEncodedAccount(
                    rpc,
                    address(accountAddress),
                    {
                        commitment: "confirmed",
                    },
                )
            },
        })
        // if account is not found, throw exception
        if (!accountInfo || !accountInfo.exists) {
            throw new SolanaAccountNotFoundException({
                kind,
                address: accountAddress,
                dexId,
                liquidityPoolId,
            })
        }

        return accountInfo as EncodedAccount
    }

    /**
     * Fetches a Solana transaction. Returns null if not found or failed.
     */
    async fetchTransaction({
        txHash,
    }: FetchSolanaTransactionParams) {
        const [transaction] = await this.asyncService.resolveTuple(
            this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.getTransaction(
                        signature(txHash),
                        {
                            commitment: "confirmed",
                            encoding: "base58",
                            maxSupportedTransactionVersion: 0,
                        },
                    ).send()
                },
            })
        )
        // if transaction is not found or failed, return null
        if (!transaction || transaction.meta?.err) {
            return null
        }
        return transaction
    }
}
