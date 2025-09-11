import { Injectable, Logger } from "@nestjs/common"
import { DevInspectResults, SuiClient } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Signer } from "@mysten/sui/cryptography"
import { RetryService } from "@modules/mixin"
import { InjectWinston } from "@modules/winston"
import { ChainId, Network } from "@modules/common"

export interface SignAndExecuteTransactionParams {
    suiClient: SuiClient
    transaction: Transaction
    signer: Signer
    handleInspectResult?: (inspectResult: DevInspectResults) => Promise<void>
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
            handleInspectResult,
        }: SignAndExecuteTransactionParams
    ): Promise<string> {
        return await this.retryService.retry({
            action: async () => { 
                if (handleInspectResult) {
                    const inspectResult = await suiClient.devInspectTransactionBlock({
                        sender: signer.toSuiAddress(),
                        transactionBlock: transaction
                    })
                    await handleInspectResult(inspectResult)
                }
                const { digest, effects } =  await suiClient.signAndExecuteTransaction({
                    transaction,
                    signer,
                })
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
            maxRetries: 10,
            delay: 100,
        })
    }
}