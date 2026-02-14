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
    RpcExecutorService,
} from "../rpc"
import {
    SolanaTx 
} from "../../types"
import {
    MissingSolanaTxParamException,
    RpcClientFatalException,
    TransactionStimulatedFailedException,
} from "@modules/exceptions"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ChainId
} from "@modules/common"
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
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * Simulates a prepared Solana transaction. Throws if solanaTx is missing or simulation fails.
     */
    async stimulate({
        signedTx,
        bot,
        transactionType,
        liquidityPoolId,
    }: StimulateSolanaTransactionParams): Promise<StimulateSolanaTransactionResult> {
        // validate signedTx
        const { signedSerializedTx } = signedTx
        const solanaTx = this.superJson.parse<SolanaTx>(signedSerializedTx)
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
        const signature = getSignatureFromTransaction(solanaTx).toString()
        // validate error
        if (result.value.err) {
            throw new RpcClientFatalException({
                message: result.value.err.toString(),
                originalError: new TransactionStimulatedFailedException(
                    {
                        botId: bot.id,
                        txHash: signature,
                        liquidityPoolId,
                        type: transactionType,
                        chainId: ChainId.Solana,
                    }
                ),
            })
        }

        // return result
        return {
            txHash: signature,
            signature,
        }
    }
}
