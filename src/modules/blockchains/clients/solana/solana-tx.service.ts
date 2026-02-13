import {
    Injectable
} from "@nestjs/common"
import {
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    compileTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    address,
    createNoopSigner,
} from "@solana/kit"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import type {
    CreateSolanaTxParams,
    CreateSolanaTxResult
} from "./types"

/**
 * Service for building Solana transactions with latest blockhash.
 * Fetches latest blockhash via RPC and returns compiled transaction + blockhash for signing/lifetime.
 *
 * @example
 * const { latestBlockhash, transaction } = await solanaTxService.createSolanaTx({
 *   bot,
 *   instructions: openPositionInstructions,
 * })
 */
@Injectable()
export class SolanaTxService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Fetches latest blockhash and builds an unsigned transaction with the given instructions.
     *
     * @param params.bot - Bot (fee payer: bot.accountAddress)
     * @param params.instructions - Instructions to append to the transaction
     * @returns latestBlockhash (for lifetime/signing) and compiled transaction
     */
    async createSolanaTx({
        bot,
        instructions,
    }: CreateSolanaTxParams): Promise<CreateSolanaTxResult> {
        const latestBlockhashResult = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await rpc.getLatestBlockhash().send()
            },
        })

        const transactionMessage = pipe(
            createTransactionMessage({
                version: 0,
            }),
            (tx) =>
                setTransactionMessageFeePayerSigner(
                    createNoopSigner(address(bot.accountAddress)),
                    tx,
                ),
            (tx) =>
                appendTransactionMessageInstructions(
                    instructions,
                    tx,
                ),
            (tx) =>
                setTransactionMessageLifetimeUsingBlockhash(
                    latestBlockhashResult.value,
                    tx,
                ),
        )
        const transaction = compileTransaction(transactionMessage)
        return {
            latestBlockhash: latestBlockhashResult.value,
            transaction,
        }
    }
}
