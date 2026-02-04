import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    PrepareTx,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResults,
} from "../types"
import {
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    MissingSuiMessageWithBytesParamException,
    ErrorTransactionType,
    TransactionValidationFailedException,
    TransactionNotFoundException,
    OutputCoinNotFoundException,
} from "@modules/exceptions"
import {
    AppVersion
} from "@modules/databases"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    Transaction,
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SuiAggregatorSelectorService,
} from "../../aggregators"
import {
    RpcExecutorService,
} from "../../clients"
import {
    SignerService,
} from "../../signers"
import {
    SelectCoinsService,
} from "../../tx-builder"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

/**
 * SuiReconcileBalanceActionService
 * 
 * Service for handling balance reconciliation on Sui.
 * This service orchestrates swap transactions to reconcile balances.
 */
@Injectable()
export class SuiReconcileBalanceActionService {
    constructor(
        private readonly suiAggregatorSelectorService: SuiAggregatorSelectorService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly signerService: SignerService,
        private readonly winstonService: WinstonService,
        private readonly selectCoinsService: SelectCoinsService,
    ) { }

    /**
     * Prepare a swap transaction for balance reconciliation.
     * Swaps from tokenIn to tokenOut for each tokenInput.
     */
    public async prepare(
        {
            bot,
            tokenInputs,
        }: PrepareReconcileBalanceTransactionParams
    ): Promise<PrepareReconcileBalanceTransactionResult> {
        let txb = new Transaction()
        txb.setSender(bot.accountAddress)
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            // if tokenIn and tokenOut are the same, skip swap
            if (tokenInput.tokenIn.displayId === tokenInput.tokenOut.displayId) {
                continue
            }
            // get the input coin
            const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
                txb,
                owner: bot.accountAddress,
                coinType: tokenInput.tokenIn.tokenAddress,
                requiredAmount: tokenInput.amount,
            })
            const { 
                aggregatorId, 
                response
            } = await this.suiAggregatorSelectorService.batchQuote({
                tokenIn: tokenInput.tokenIn,
                tokenOut: tokenInput.tokenOut,
                amountIn: tokenInput.amount,
                senderAddress: bot.accountAddress,
            })
            const { outputCoin, txb: swapTxb } = await this.suiAggregatorSelectorService.selectorSwap({
                base: {
                    payload: response.payload,
                    tokenIn: tokenInput.tokenIn,
                    tokenOut: tokenInput.tokenOut,
                    accountAddress: bot.accountAddress,
                    txb,
                    inputCoin: sourceCoin.coinArg,
                },
                aggregatorId,
            })
            if (!swapTxb) {
                throw new TransactionNotFoundException({
                })
            }
            txb = swapTxb
            // transfer the output coin to the bot's account address
            if (!outputCoin) {
                throw new OutputCoinNotFoundException(
                    { 
                        botId: bot.id,
                        type: ErrorTransactionType.ReconcileBalance,
                    }
                )
            }
            txb.transferObjects([outputCoin],
                bot.accountAddress)
        }
        const transaction = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    const bytes = await txb.build({
                        client: suiClient,
                    })
                    const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                    const signatureWithBytes = await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            return await signer.signTransaction(bytes)
                        },
                    })
                    return {
                        txHash,
                        signatureWithBytes,
                    }
                } else {
                    if (!bot.privyMetadata?.walletPublicKey) {
                        throw new PrivyPublicKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
                    if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
                    return await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: txb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                }
            },
        })
        prepareTxs.push({
            txHash: transaction.txHash,
            signatureWithBytes: transaction.signatureWithBytes,
        })
        return {
            prepareTxs,
        }
    }

    /**
     * Execute a swap transaction for balance reconciliation.
     */
    public async execute(
        {
            bot,
            prepareTxs,
            isRetry = false,
            stimulate = false,
        }: ExecuteReconcileBalanceTransactionParams
    ): Promise<ExecuteReconcileBalanceTransactionResults> {
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
            // if isRetry, check if transaction has already been executed
            if (isRetry) {
                const transaction = await this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return await suiClient.getTransactionBlock({
                            digest: prepareTx.txHash,
                            options: {
                                showEffects: true,
                            },
                        })
                    },
                })
                // if transaction already exists on chain and is successful, add to txHashes
                if (transaction && transaction.effects?.status?.status === "success") {
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }
            const signatureWithBytes = prepareTx.signatureWithBytes
            if (!signatureWithBytes) {
                throw new MissingSuiMessageWithBytesParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.ReconcileBalance,
                })
            }
            // execute the transaction
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    if (stimulate) {
                        const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                        const devInspect = await suiClient.devInspectTransactionBlock(
                            {
                                transactionBlock,
                                sender: bot.accountAddress,
                            }
                        )
                        if (devInspect.effects.status.status !== "success") {
                            throw new TransactionValidationFailedException({
                                botId: bot.id,
                                txHash: devInspect.effects.transactionDigest,
                                type: ErrorTransactionType.ReconcileBalance,
                            })
                        }
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                            }
                        )
                        return
                    }
                    const { digest } = await suiClient.executeTransactionBlock({
                        transactionBlock: signatureWithBytes.bytes,
                        signature: signatureWithBytes.signature,
                    })
                    await suiClient.waitForTransaction(
                        {
                            digest,
                        }
                    )
                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                },
            })
            txHashes.push(prepareTx.txHash)
        }
        return {
            txHashes,
        }
    }
}
