import {
    Injectable
} from "@nestjs/common"
import {
    getSignatureFromTransaction,
    sendAndConfirmTransactionFactory,
} from "@solana/kit"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    MissingSolanaTxParamException,
    RpcClientFatalException,
    TransactionExecutionFailedException,
} from "@modules/exceptions"
import {
    AsyncService
} from "@modules/mixin"
import type {
    ExecuteSolanaTransactionParams,
    ExecuteSolanaTransactionResult  
} from "./types"

/**
 * Service responsible for executing (sending and confirming) Solana transactions on-chain.
 * Accepts prepareTx and bot; throws on missing solanaTx or execution failure.
 *
 * @example
 * const { txHash } = await executeService.execute({ prepareTx, bot, transactionType })
 */
@Injectable()
export class SolanaExecuteService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly asyncService: AsyncService,
    ) {}

    /**
     * Sends and confirms a prepared Solana transaction. Throws if solanaTx is missing or execution fails.
     */
    async execute(
        {
            prepareTx,
            bot,
            transactionType,
            liquidityPoolId,
        }: ExecuteSolanaTransactionParams
    ): Promise<ExecuteSolanaTransactionResult> {
        const { solanaTx } = prepareTx
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: transactionType,
            })
        }

        const sendAndConfirmTransaction = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Write,
            callback: async ({ rpc, rpcSubscriptions }) => {
                return sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
            },
        })

        const [, error] = await this.asyncService.resolveTuple(
            sendAndConfirmTransaction(
                solanaTx,
                {
                    commitment: "confirmed",
                },
            ),
        )

        if (error) {
            throw new RpcClientFatalException(
                {
                    originalError: new TransactionExecutionFailedException(
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId,
                            type: transactionType,
                        },
                    ),
                    message: error.toString(),
                }
            )
        }

        const txHash = getSignatureFromTransaction(solanaTx).toString()
        return {
            txHash 
        }
    }
}
