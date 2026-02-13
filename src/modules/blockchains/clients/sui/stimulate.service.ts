import {
    Injectable
} from "@nestjs/common"
import {
    Transaction
} from "@mysten/sui/transactions"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    TransactionStimulatedFailedException,
    RpcClientFatalException,
    MissingSuiMessageWithBytesParamException,
} from "@modules/exceptions"
import type {
    StimulateSuiTransactionParams
} from "./types"

/**
 * Service responsible for simulating Sui transactions (dev-inspect / dry-run).
 * Accepts prepareTx and bot; throws TransactionSubmitFailedException when stimulation fails.
 *
 * @example
 * await stimulateService.stimulate({ prepareTx, bot, transactionType: TransactionType.Withdraw })
 */
@Injectable()
export class SuiStimulateService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Runs the prepared transaction in dev-inspect mode. Throws if signatureWithBytes is missing or simulation fails.
     */
    async stimulate(
        {
            signatureWithBytes,
            bot,
            transactionType,
            liquidityPoolId,
        }: StimulateSuiTransactionParams
    ) {
        // validate signatureWithBytes
        if (!signatureWithBytes) {
            throw new MissingSuiMessageWithBytesParamException({
                botId: bot.id,
                type: transactionType,
            })
        }
       
        // validate transaction block
        const transactionBlock = Transaction.from(signatureWithBytes.bytes)

        // dev inspect transaction block
        const result = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.devInspectTransactionBlock({
                    transactionBlock,
                    sender: bot.accountAddress,
                })
            },
        })

        // validate result
        if (result.effects.status.status !== "success") {
            throw new RpcClientFatalException({
                message: result.effects.status.error ?? "Unknown error",
                originalError: new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: result.effects.transactionDigest,
                    liquidityPoolId,
                    type: transactionType,
                }),
            })
        }

        // return result
        return result
    }
}
