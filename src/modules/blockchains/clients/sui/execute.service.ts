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
    ) {}

    /**
     * Executes a prepared Sui transaction. Throws if signatureWithBytes is missing or execution fails.
     */
    async execute({
        prepareTx,
        bot,
        transactionType,
        liquidityPoolId,
    }: ExecuteSuiTransactionParams): Promise<ExecuteSuiTransactionResult> {
        const { signatureWithBytes } = prepareTx
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash: prepareTx.txHash,
                liquidityPoolId,
                type: transactionType,
            })
        }

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

        if (effects?.status?.status !== "success") {
            throw new RpcClientFatalException({
                message: effects?.status?.error ?? "Unknown error",
                originalError: new TransactionExecutionFailedException({
                    botId: bot.id,
                    txHash: digest,
                    liquidityPoolId,
                    type: transactionType,
                }),
            })
        }

        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })

        return {
            txHash: digest,
            events: events ?? [],
        }
    }
}
