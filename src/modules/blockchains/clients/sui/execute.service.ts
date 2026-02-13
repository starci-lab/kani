import {
    Injectable
} from "@nestjs/common"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    TransactionNotPreparedException,
    TransactionExecutionFailedException,
    RpcClientFatalException,
} from "@modules/exceptions"
import type {
    ExecuteSuiTransactionParams,
    ExecuteSuiTransactionResult
} from "./types"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    ChainId 
} from "@modules/common"

/**
 * Service responsible for executing (sending and waiting for) Sui transactions on-chain.
 * Accepts prepareTx and bot; throws on missing signatureWithBytes or execution failure.
 *
 * @example
 * const { txHash } = await executeService.execute({ prepareTx, bot, transactionType })
 */
@Injectable()
export class SuiExecuteService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Executes a prepared Sui transaction. Throws if signatureWithBytes is missing or execution fails.
     */
    async execute({
        signedTx,
        bot,
        transactionType,
        liquidityPool,
    }: ExecuteSuiTransactionParams): Promise<ExecuteSuiTransactionResult> {
        // stage: validation
        const { signatureWithBytes } = signedTx
        /**
         * If signature with bytes is not found, throw an exception.
         */
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash: signedTx.txHash,
                liquidityPoolId: liquidityPool?.displayId,
                type: transactionType,
            })
        }

        // stage: execution
        const { digest, effects, events } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEffects: true,
                        showEvents: true,
                    },
                })
            },
        })

        // stage: validation
        if (effects?.status?.status !== "success") {
            throw new RpcClientFatalException({
                message: effects?.status?.error ?? "Unknown error",
                originalError: new TransactionExecutionFailedException(
                    {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: liquidityPool?.displayId,
                        type: transactionType,
                    }
                ),
            })
        }

        // stage: confirmation
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })

        // stage: logging
        this.winstonService.log(
            WinstonLog.TransactionExecuted,
            {
                botId: bot.id,
                txHash: digest,
                liquidityPoolId: liquidityPool?.displayId,
                type: transactionType,
                chainId: ChainId.Sui,
            }
        )

        // stage: return
        return {
            txHash: digest,
            events: events ?? [],
        }
    }
}
