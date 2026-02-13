import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareReconcileBalanceTransactionParams,
    PrepareReconcileBalanceTransactionResult,
    ExecuteReconcileBalanceTransactionParams,
    ExecuteReconcileBalanceTransactionResult,
} from "../types"
import {
    PrepareTx,
} from "../../types"
import {
    PrivyMetadataNotFoundException, 
    EncryptedPrivySignerPrivateKeyNotFoundException, 
    MissingSolanaTxParamException,
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
} from "@modules/exceptions"
import {
    AppVersion,
    TransactionType
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
import {
    AsyncService 
} from "@modules/mixin"

/**
 * Service for handling balance reconciliation on Solana.
 * Orchestrates swap transactions to reconcile balances between tokens.
 *
 * @example
 * const service = new SolanaReconcileBalanceActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs })
 * const txHashes = await service.execute({ bot, prepareTxs })
 */
@Injectable()
export class SolanaReconcileBalanceActionService {
    constructor(
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly signerService: SignerService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Prepares swap transactions for balance reconciliation.
     * Swaps from tokenIn to tokenOut for each tokenInput.
     *
     * @param param - Parameters for preparing reconcile balance transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTxs = await service.prepare({ bot, tokenInputs })
     */
    public async prepare({ bot, tokenInputs }: PrepareReconcileBalanceTransactionParams): Promise<PrepareReconcileBalanceTransactionResult> {
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            // skip swap if tokenIn and tokenOut are the same
            if (tokenInput.tokenIn.displayId === tokenInput.tokenOut.displayId) {
                continue
            }
            // get best quote from aggregator
            const { response, aggregatorId } = await this.solanaAggregatorSelectorService.batchQuote({
                tokenIn: tokenInput.tokenIn,
                tokenOut: tokenInput.tokenOut,
                amountIn: tokenInput.amount,
                senderAddress: bot.accountAddress,
            })
            const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
                aggregatorId,
                base: {
                    payload: response.payload,
                    tokenIn: tokenInput.tokenIn,
                    tokenOut: tokenInput.tokenOut,
                    accountAddress: bot.accountAddress,  
                },
            })
            // decode serialized transaction from aggregator
            const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
            const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
            const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                swapTransaction.messageBytes,
            )
            
            // decompile transaction message to get instructions
            const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await decompileTransactionMessageFetchingLookupTables(
                        compiledSwapTransactionMessage,
                        rpc
                    )
                },
            })
            
            // extract swap instructions from transaction message
            const swapInstructions = swapTransactionMessage.instructions
            
            // get latest blockhash for transaction lifetime
            const { value: latestBlockhash } = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.getLatestBlockhash().send()
                },
            })
            
            // build transaction message with swap instructions
            const transactionMessage = pipe(
                createTransactionMessage({
                    version: 0 
                }),
                (tx) => setTransactionMessageFeePayerSigner(
                    createNoopSigner(address(bot.accountAddress)),
                    tx
                ),
                (tx) => setTransactionMessageLifetimeUsingBlockhash(
                    latestBlockhash,
                    tx
                ),
                (tx) => appendTransactionMessageInstructions(
                    swapInstructions,
                    tx
                ),
            )
            const compiledTransaction = compileTransaction(transactionMessage)
            
            // sign transaction based on bot version
            let prepareTx: PrepareTx
            if (bot.version === AppVersion.V1) {
                const signedTransaction = await this.signerService.withSolanaSigner({
                    bot,
                    action: async (signer) => {
                        return await signTransaction(
                            [signer.keyPair],
                            compiledTransaction,
                        )
                    },
                })
                
                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                const txHash = transactionSignature.toString()
                
                // validate transaction before returning
                assertIsSendableTransaction(signedTransaction)
                assertIsTransactionWithinSizeLimit(signedTransaction)
                
                prepareTx = {
                    txHash,
                    solanaTx: signedTransaction,
                }

                const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async (
                        { rpc }
                    ) => {
                        return await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(prepareTx.solanaTx!),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            },
                        ).send()
                    },
                })
                if (simulateResult.value.err) {
                    throw new TransactionStimulateFailedException({
                        message: simulateResult.value.err.toString(),
                        originalError: new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            type: TransactionType.ReconcileBalance,
                        }),
                    })
                }
            } else {
                // validate privy metadata for V2 bots
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
                
                // sign transaction with Privy gas sponsor
                const signedTransaction = await this.privySignService.signSolanaTransaction({
                    lifetimeConstraint: {
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                    },
                    transaction: compiledTransaction,
                    encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    walletId: bot.privyMetadata.walletId,
                })

                prepareTx = {
                    txHash: signedTransaction.txHash,
                    solanaTx: signedTransaction.signedTransaction,
                }
                const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(prepareTx.solanaTx!),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            },
                        ).send()
                    },
                })
                if (simulateResult.value.err) {
                    throw new TransactionStimulatedFailedException({
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        type: TransactionType.ReconcileBalance,
                    })
                }
            }
            prepareTxs.push(prepareTx)
        }
        return {
            prepareTxs,
        }
    }

    /**
     * Executes swap transactions for balance reconciliation.
     *
     * @param param - Parameters for executing reconcile balance transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHashes = await service.execute({ bot, prepareTxs })
     */
    public async execute(
        { 
            bot, 
            prepareTxs, 
            isRetry = false, 
            stimulate = false 
        }: ExecuteReconcileBalanceTransactionParams): 
        Promise<ExecuteReconcileBalanceTransactionResult> {
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
            // check if transaction already exists on chain (for retries)
            if (isRetry) {
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.getTransaction(
                            signature(prepareTx.txHash),
                            {
                                commitment: "confirmed", 
                                encoding: "base58",
                                maxSupportedTransactionVersion: 0,
                            }
                        ).send()
                    },
                })
                
                // skip if transaction already exists
                if (transaction) {
                    this.winstonService.log(
                        WinstonLog.ReconcileBalanceTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }   
            
            // validate transaction exists
            const { solanaTx } = prepareTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: TransactionType.ReconcileBalance,
                })
            }
            
            // execute or simulate transaction
            if (stimulate) {
                // simulate transaction without sending
                const simulateTransactionResult = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(solanaTx),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            }).send()
                    },
                })
                
                if (simulateTransactionResult.value.err) {
                    throw new TransactionSubmitFailedException({
                        originalError: new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            type: TransactionType.ReconcileBalance,
                        }),
                        message: simulateTransactionResult.value.err.toString(),
                    })
                }
                
                this.winstonService.log(
                    WinstonLog.ReconcileBalanceTransactionStimulated,
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                    }
                )
                txHashes.push(prepareTx.txHash)
            } else {
                // send and confirm transaction
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
                    ))
                if (error) {
                    throw new TransactionSubmitFailedException({
                        message: error.toString(),
                        originalError: new TransactionExecutionFailedException({
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            type: TransactionType.ReconcileBalance,
                        })
                    })
                }
                const transactionSignature = getSignatureFromTransaction(solanaTx)
                this.winstonService.log(
                    WinstonLog.ReconcileBalanceTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: transactionSignature.toString(),
                    }
                )
                txHashes.push(prepareTx.txHash)
            }    
        } 
        return {
            txHashes,
        }
    }
}
