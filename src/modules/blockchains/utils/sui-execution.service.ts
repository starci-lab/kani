import { Injectable, Logger } from "@nestjs/common"
import { DevInspectResults, SuiClient, SuiObjectChange, TransactionEffects, SuiEvent } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Signer } from "@mysten/sui/cryptography"
import { RetryService } from "@modules/mixin"
import { InjectWinston } from "@modules/winston"
import { ChainId, Network } from "@modules/common"

export interface SignAndExecuteTransactionParams {
    suiClient: SuiClient
    transaction: Transaction
    signer: Signer
    stimulateOnly?: boolean
    handleInspectResult?: (inspectResult: DevInspectResults) => Promise<void> | void
    handleEffects?: (effects: TransactionEffects) => Promise<void> | void
    handleObjectChanges?: (objectChanges: Array<SuiObjectChange>) => Promise<void> | void
    handleEvents?: (events: Array<SuiEvent>) => Promise<void> | void
}
@Injectable()
export class SuiExecutionService {
    constructor(
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly winstonLogger: Logger,
    ) {}

    public async signAndExecuteTransaction(
        {   
            transaction,
            signer,
            suiClient,
            stimulateOnly,
            handleInspectResult,
            handleEffects,
            handleObjectChanges,
            handleEvents,
        }: SignAndExecuteTransactionParams
    ): Promise<string> {
        return await this.retryService.retry({
            action: async () => { 
                if (handleInspectResult || stimulateOnly) {
                    const inspectResult = await suiClient.devInspectTransactionBlock({
                        sender: signer.toSuiAddress(),
                        transactionBlock: transaction,
                    })
                    if (handleInspectResult) {
                        await handleInspectResult(inspectResult)
                    }
                    if (handleEvents && stimulateOnly) {
                        if (!inspectResult.events) {
                            throw new Error("Events not found")
                        }
                        await handleEvents(inspectResult.events)
                    }
                    return inspectResult.effects.transactionDigest
                }
                const { digest, effects, objectChanges, events } =  await suiClient.signAndExecuteTransaction({
                    transaction,
                    signer,
                    options: {
                        showEffects: true,
                        showObjectChanges: true,
                        showBalanceChanges: true,
                        showEvents: true
                    }
                })
                await suiClient.waitForTransaction({
                    digest,
                })
                if (handleEffects) {
                    if (!effects) {
                        throw new Error("Effects not found")
                    }
                    await handleEffects(effects)
                }
                if (handleObjectChanges) {
                    if (!objectChanges) {
                        throw new Error("Object changes not found")
                    }
                    await handleObjectChanges(objectChanges)
                }
                if (handleEvents) {
                    if (!events) {
                        throw new Error("Events not found")
                    }
                    await handleEvents(events)
                }
                if (effects?.status.status === "failure") {
                    this.winstonLogger.error(
                        "TransactionFailed", {
                            txHash: digest,
                            chainId: ChainId.Sui,
                            network: Network.Mainnet,
                            error: effects.status.error,
                        })
                    throw new Error(effects.status.error)
                }
                this.winstonLogger.log(
                    "TransactionExecuted", {
                        txHash: digest,
                        chainId: ChainId.Sui,
                        network: Network.Mainnet,
                    })
                return digest
            },
            maxRetries: 1,
            delay: 100,
        })
    }
}