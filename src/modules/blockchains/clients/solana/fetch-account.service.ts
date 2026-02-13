import {
    Injectable
} from "@nestjs/common"
import {
    address,
    EncodedAccount,
    fetchEncodedAccount
} from "@solana/kit"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    SolanaAccountNotFoundException
} from "@modules/exceptions"
import type {
    FetchSolanaAccountParams,
} from "./types"

/**
 * Service for fetching a Solana account by address.
 * Throws if account does not exist; returns encoded account (exists is true when returned).
 *
 * @example
 * const account = await fetchAccountService.fetchAccount({
 *   address: positionId,
 *   kind: AccountKind.PersonalPosition,
 *   dexId: DexId.Meteora,
 *   liquidityPoolId: liquidityPool.displayId,
 * })
 */
@Injectable()
export class SolanaFetchAccountService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
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
}
