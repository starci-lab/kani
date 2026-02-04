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
    PrivyMetadataNotFoundException, 
    EncryptedPrivySignerPrivateKeyNotFoundException, 
    MissingSolanaTxParamException,
    ErrorTransactionType,
    TransactionValidationFailedException,
} from "@modules/exceptions"
import {
    AppVersion
} from "@modules/databases"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    pipe,
    getBase64Encoder, 
    getTransactionDecoder, 
    getCompiledTransactionMessageDecoder, 
    decompileTransactionMessageFetchingLookupTables, 
    address, 
    createTransactionMessage, 
    setTransactionMessageFeePayerSigner, 
    createNoopSigner, 
    setTransactionMessageLifetimeUsingBlockhash, 
    appendTransactionMessageInstructions, 
    compileTransaction, 
    signTransaction, 
    getSignatureFromTransaction, 
    assertIsSendableTransaction, 
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    signature,
    getBase64EncodedWireTransaction,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService,
    RpcExecutorService,
    SignerService,
} from "@modules/blockchains"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

/**
 * SolanaReconcileBalanceActionService
 * 
 * Service for handling balance reconciliation on Solana.
 * This service orchestrates swap transactions to reconcile balances,
 * reusing the swap logic from SolanaOpenPositionActionService.
 */
@Injectable()
export class SolanaReconcileBalanceActionService {
    constructor(
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly signerService: SignerService,
        private readonly winstonService: WinstonService,
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
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            // if tokenIn and tokenOut are the same, skip swap
            if (tokenInput.tokenIn.displayId === tokenInput.tokenOut.displayId) {
                continue
            }
            const {
                response: {
                    payload: serializedTransaction
                }
            } = await this.solanaAggregatorSelectorService.batchQuote({
                tokenIn: tokenInput.tokenIn,
                tokenOut: tokenInput.tokenOut,
                amountIn: tokenInput.amount,
                senderAddress: bot.accountAddress,
            })
            const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
            const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
            const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                swapTransaction.messageBytes,
            )
            const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await decompileTransactionMessageFetchingLookupTables(
                        compiledSwapTransactionMessage,
                        rpc
                    )
                },
            })
            // we get the swap instructions
            const swapInstructions = swapTransactionMessage.instructions
            // we get the latest blockhash
            const transaction = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                    const transactionMessage = pipe(
                        createTransactionMessage({
                            version: 0 
                        }),
                        (tx) => setTransactionMessageFeePayerSigner(
                            createNoopSigner(address(bot.accountAddress)),
                            tx),
                        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                            tx
                        ),
                        (tx) => appendTransactionMessageInstructions(swapInstructions,
                            tx
                        ),
                    )
                    const transaction = compileTransaction(transactionMessage)
                    if (bot.version === AppVersion.V1) {
                        return await this.signerService.withSolanaSigner({
                            bot,
                            action: async (signer) => {
                                const signedTransaction = await signTransaction(
                                    [signer.keyPair],
                                    transaction,
                                ) 
                                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                                const txHash = transactionSignature.toString()
                                assertIsSendableTransaction(signedTransaction)
                                assertIsTransactionWithinSizeLimit(signedTransaction)
                                return {
                                    txHash,
                                    solanaTx: signedTransaction,
                                }
                            },
                        })
                    } else {
                        if (!bot.privyMetadata) {
                            throw new PrivyMetadataNotFoundException({
                                botId: bot.id,
                            })
                        }
                        if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                            throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                                botId: bot.id,
                            })
                        }
                        // partial sign the transaction with the gas sponsor
                        const signedTransaction = await this.privySignService.signSolanaTransaction({
                            lifetimeConstraint: {
                                blockhash: latestBlockhash.blockhash,
                                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                            },
                            transaction,
                            encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                            walletId: bot.privyMetadata.walletId,
                        })

                        return {
                            txHash: signedTransaction.txHash,
                            solanaTx: signedTransaction.signedTransaction,
                        }
                    }
                },
            })
            prepareTxs.push({
                txHash: transaction.txHash,
                solanaTx: transaction.solanaTx,
            })
        }
        return {
            prepareTxs,
        }
    }

    /**
     * Execute a swap transaction for balance reconciliation.
     * Reuses the open position action service's execute method.
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
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.getTransaction(signature(prepareTx.txHash),
                            {
                                commitment: "confirmed", 
                                encoding: "base58" 
                            }).send()
                    },
                })
                // if transaction already exists on chain, skip it
                if (transaction) {
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }   
            const solanaTx = prepareTx.solanaTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.ReconcileBalance,
                })
            }
            // execute the transaction
            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Write,
                callback: async ({ rpc, rpcSubscriptions }) => {
                    if (stimulate) {
                        const simulateTransactionResult = await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(solanaTx),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            }).send()
                        if (simulateTransactionResult.value.err) {
                            throw new TransactionValidationFailedException({
                                botId: bot.id,
                                txHash: prepareTx.txHash,
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
                    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                        rpc,
                        rpcSubscriptions,
                    })
                    const transactionSignature = getSignatureFromTransaction(solanaTx)
                    await sendAndConfirmTransaction(
                        solanaTx,
                        {
                            commitment: "confirmed",
                        })
                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: transactionSignature.toString(),
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
