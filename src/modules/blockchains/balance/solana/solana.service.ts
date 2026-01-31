import {
    Injectable 
} from "@nestjs/common"
import {
    IBalanceService,
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResult,
    ExecuteSwapTransactionParams,
} from "../balance.interface"
import { 
    AppVersion,
} from "@modules/databases"
import {
    EncryptedPrivySignerPrivateKeyNotFoundException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
    PrivyMetadataNotFoundException,
    TransactionValidationFailedException
} from "@modules/exceptions"
import BN from "bn.js"
import {
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    decompileTransactionMessageFetchingLookupTables,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    compileTransaction,
    signTransaction,
    setTransactionMessageFeePayerSigner,
    pipe,
    createTransactionMessage,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    getSignatureFromTransaction,
    createNoopSigner,
    address,
    signature,
    getBase64EncodedWireTransaction,
    Rpc,
    SolanaRpcApi,
    RpcSubscriptions,
    SolanaRpcSubscriptionsApi,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService 
} from "../../aggregators"
import {
    SignerService 
} from "../../signers"
import {
    BotSchema, TokenSchema 
} from "@modules/databases"
import {
    RpcExecutorService 
} from "@modules/blockchains"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    PrivySignService 
} from "@modules/privy"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }


    public async prepareSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
        }: PrepareSwapTransactionParams
    ): Promise<PrepareSwapTransactionResult> {
        const batchQuoteResult = await this.solanaAggregatorSelectorService.batchQuote({
            tokenIn,
            tokenOut,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        // we fetch the serialized transaction from the aggregator
        const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
            base: {
                payload: batchQuoteResult.response.payload,
                tokenIn,
                tokenOut,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: batchQuoteResult.aggregatorId,
        })
        // we decode the serialized transaction
        const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
            swapTransaction.messageBytes,
        )
        return await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                const swapTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
                    compiledSwapTransactionMessage,
                    rpc
                )
                // we get the swap instructions
                const swapInstructions = swapTransactionMessage.instructions
                // we get the latest blockhash
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({
                        version: 0 
                    }),
                    (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                        tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                        tx),
                    (tx) => appendTransactionMessageInstructions(swapInstructions,
                        tx),
                )
                const transaction = compileTransaction(transactionMessage)
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSolanaSigner({
                        bot,
                        action: async (signer) => {
                            // sign the transaction
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
                                tokenIn,
                                tokenOut,
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
                        tokenIn,
                        tokenOut,
                    }
                }
            },
        })
    }

    public async executeSwapTransaction(
        {
            bot,
            txHash,
            solanaTx,
            txCheck,
            stimulate,
        }: ExecuteSwapTransactionParams
    ): Promise<void> {
        if (txCheck && !stimulate) {
            const transaction = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await rpc.getTransaction(signature(txHash),
                        {
                            commitment: "confirmed", encoding: "base58" 
                        }).send()

                },
            })
            if (transaction) {
                return
            }
        }
        if (!solanaTx) {
            throw new MissingSolanaTxParamException({
                botId: bot.id,
                type: ErrorTransactionType.Swap,
            })
        }
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
                            txHash,
                            type: ErrorTransactionType.Swap,
                        })
                    }
                    this.winstonService.log(
                        WinstonLog.SwapTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                        }
                    )
                    return txHash
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
                    WinstonLog.SwapTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: transactionSignature.toString(),
                    }
                )
            },
        })
    }
}   

export interface ComputeTargetToQuoteSwapParams {
    targetToken: TokenSchema
    quoteToken: TokenSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ComputeTargetToQuoteSwapResult {
    inputAmount: BN
    estimatedOutputAmount: BN
    requiredSwap: boolean
}

export interface CreateTransferFeesTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    feeAmount: BN
}