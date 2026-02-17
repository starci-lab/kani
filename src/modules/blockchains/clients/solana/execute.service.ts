import {
    Injectable
} from "@nestjs/common"
import {
    getSignatureFromTransaction,
    sendAndConfirmTransactionFactory,
} from "@solana/kit"
import {
    RpcExecutorService,
} from "../rpc"
import {
    SolanaTx 
} from "../../types"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    MissingSolanaTxParamException,
    RpcClientFatalException,
    TransactionExecutionFailedException,
} from "@modules/exceptions"
import {
    AsyncService,
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
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
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * Sends and confirms a prepared Solana transaction. Throws if solanaTx is missing or execution fails.
     */
    async execute(
        {
            signedTx,
            bot,
            transactionType,
            liquidityPoolId,
        }: ExecuteSolanaTransactionParams
    ): Promise<ExecuteSolanaTransactionResult> {
        const { signedSerializedTx } = signedTx
        const solanaTx = this.superJson.parse<SolanaTx>(signedSerializedTx)
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
            console.log(error)
            throw new RpcClientFatalException(
                {
                    originalError: new TransactionExecutionFailedException(
                        {
                            botId: bot.id,
                            txHash: getSignatureFromTransaction(solanaTx).toString(),
                            liquidityPoolId,
                            type: transactionType,
                        },
                    ),
                    message: error.toString(),
                }
            )
        }

        const signature = getSignatureFromTransaction(solanaTx).toString()
        return {
            txHash: signature,
            signature,
        }
    }
}
