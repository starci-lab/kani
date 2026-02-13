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
    StimulateSuiTransactionParams,
    StimulateSuiTransactionResult
} from "./types"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    ChainId 
} from "@modules/common"

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
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Runs the prepared transaction in dev-inspect mode. Throws if signatureWithBytes is missing or simulation fails.
     */
    async stimulate(
        {
            signedTx,
            bot,
            transactionType,
            liquidityPool,
        }: StimulateSuiTransactionParams
    ): Promise<StimulateSuiTransactionResult> {
        // stage: validation
        if (!signedTx.signatureWithBytes) {
            throw new MissingSuiMessageWithBytesParamException({
                botId: bot.id,
                type: transactionType,
            })
        }
       
        // stage: validation
        const transactionBlock = Transaction.from(signedTx.signatureWithBytes.bytes)

        // stage: stimulation
        const result = await this.rpcExecutorService.withSuiClient(
            {
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                },
            }
        )

        // stage: validation
        if (result.effects.status.status !== "success") {
            throw new RpcClientFatalException(
                {
                    message: result.effects.status.error ?? "Unknown error",
                    originalError: new TransactionStimulatedFailedException(
                        {
                            botId: bot.id,
                            txHash: result.effects.transactionDigest,
                            liquidityPoolId: liquidityPool?.displayId,
                            type: transactionType,
                            chainId: ChainId.Sui,
                        }
                    ),
                }
            )
        }

        // stage: logging
        this.winstonService.log(
            WinstonLog.TransactionStimulated,
            {
                botId: bot.id,
                txHash: result.effects.transactionDigest,
                liquidityPoolId: liquidityPool?.displayId,
                type: transactionType,
                chainId: ChainId.Sui,
            }
        )

        // stage: return
        return {
            txHash: result.effects.transactionDigest,
            events: result.events || [],
        }
    }
}
