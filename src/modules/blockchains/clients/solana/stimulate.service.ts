import {
    Injectable
} from "@nestjs/common"
import {
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction
} from "@solana/kit"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    MissingSolanaTxParamException,
    RpcClientFatalException,
    TransactionStimulatedFailedException,
} from "@modules/exceptions"
import type {
    StimulateSolanaTransactionParams,
    StimulateSolanaTransactionResult
} from "./types"

/**
 * Service responsible for simulating Solana transactions (dry-run).
 * Accepts prepareTx and bot; throws TransactionSubmitFailedException when stimulation fails.
 *
 * @example
 * await stimulateService.stimulate({ prepareTx, bot, transactionType: TransactionType.Withdraw })
 */
@Injectable()
export class SolanaStimulateService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Simulates a prepared Solana transaction. Throws if solanaTx is missing or simulation fails.
     */
    async stimulate({
        solanaTx,
        bot,
        transactionType,
        liquidityPoolId,
    }: StimulateSolanaTransactionParams): Promise<StimulateSolanaTransactionResult> {
        // validate solanaTx
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: transactionType,
            })
        }

        // simulate transaction
        const result = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await rpc
                    .simulateTransaction(
                        getBase64EncodedWireTransaction(solanaTx),
                        {
                            encoding: "base64",
                            commitment: "confirmed",
                        },
                    )
                    .send()
            },
        })
        // validate result
        const txHash = getSignatureFromTransaction(solanaTx)
        // validate error
        if (result.value.err) {
            throw new RpcClientFatalException({
                message: result.value.err.toString(),
                originalError: new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash,
                    liquidityPoolId,
                    type: transactionType,
                }),
            })
        }

        // return result
        return {
            txHash,
        }
    }
}
