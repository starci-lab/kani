import {
    Injectable
} from "@nestjs/common"
import {
    Transaction
} from "@mysten/sui/transactions"

import {
    TransactionStimulatedFailedException,
    RpcClientFatalException,
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
import {
    RpcExecutorService
} from "../rpc/rpc-executor.service"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"
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
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
        const signatureWithBytes = this.superJson.parse<SignatureWithBytes>(signedTx.signedSerializedTx)
        const transactionBlock = Transaction.from(signatureWithBytes.bytes)
        // stage: stimulation
        const stimulateResult = await this.rpcExecutorService.withSuiClient(
            {
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock(
                        {
                            transactionBlock,
                            sender: bot.accountAddress,
                        })
                }
            }
        )
        // stage: validation
        if (stimulateResult.effects.status.status !== "success") {
            throw new RpcClientFatalException(
                {
                    message: stimulateResult.effects.status.error ?? "Unknown error",
                    originalError: new TransactionStimulatedFailedException(
                        {
                            botId: bot.id,
                            txHash: stimulateResult.effects.transactionDigest,
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
                txHash: stimulateResult.effects.transactionDigest,
                liquidityPoolId: liquidityPool?.displayId,
                type: transactionType,
                chainId: ChainId.Sui,
            }
        )

        // stage: return
        return {
            txHash: stimulateResult.effects.transactionDigest,
            events: stimulateResult.events || [],
        }
    }
}
