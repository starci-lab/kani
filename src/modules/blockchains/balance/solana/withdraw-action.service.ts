import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
} from "../types"
import {
    PrepareTx
} from "../../interfaces"
import {
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import { 
    AppVersion,
    TokenId,
} from "@modules/databases"
import {
    EncryptedPrivySignerPrivateKeyNotFoundException,
    ErrorTransactionType,
    MissingSolanaTxParamException,
    PrivyMetadataNotFoundException,
    TokenNotFoundException,
    TransactionValidationFailedException,
} from "@modules/exceptions"
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
    getSignatureFromTransaction,
    createNoopSigner,
    address,
    Instruction,
    sendAndConfirmTransactionFactory,
    signature,
    getBase64EncodedWireTransaction,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService 
} from "../../aggregators"
import {
    SignerService 
} from "../../signers"
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
    TransferInstructionService,
} from "../../tx-builder"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@Injectable()
export class SolanaWithdrawActionService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly transferInstructionService: TransferInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
    ) { }

    public async prepare(
        {
            bot,
            tokenInputs,
            toAddress,
            toUsdc = false,
        }: PrepareWithdrawTransactionParams
    ): Promise<PrepareWithdrawTransactionResult> {
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            const instructions: Array<Instruction> = []
            if (toUsdc) {
                const usdcToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    displayId: {
                        $eq: TokenId.SolUsdc,
                    }
                }) 
                if (!usdcToken) {
                    throw new TokenNotFoundException({
                        displayId: TokenId.SolUsdc,
                    })
                }
                // if the token is not the same as the usdc token, we need to swap it to usdc
                if (tokenInput.token.displayId !== TokenId.SolUsdc) {
                    const {
                        response: {
                            payload: serializedTransaction
                        }
                    } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: usdcToken,
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
                    instructions.push(...swapInstructions)
                }
            } else {
                // mean to target token
                const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: tokenInput.token.displayId,
                    }
                })
                if (!targetToken) {
                    throw new TokenNotFoundException({
                        displayId: tokenInput.token.displayId,
                    })  
                }
                // if the token is not the same as the target token, we need to swap it to the target token
                if (tokenInput.token.displayId !== targetToken.displayId) {
                    const {
                        response: {
                            payload: serializedTransaction
                        }
                    } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: targetToken,
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
                    instructions.push(...swapInstructions)
                }
            }
            // transfer to toAddress
            const {
                instructions: transferInstructions
            } = await this.transferInstructionService.createTransferInstructions({
                fromAddress: address(bot.accountAddress),
                toAddress: address(toAddress),
                amount: tokenInput.amount,
                token: tokenInput.token,
            })
            instructions.push(...transferInstructions)
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
                        (tx) => appendTransactionMessageInstructions(instructions,
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

    public async execute(
        {
            bot,
            prepareTxs,
            isRetry = false,
            stimulate = false,
        }: ExecuteWithdrawTransactionParams
    ): Promise<ExecuteWithdrawTransactionResult> {
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
                    this.winstonService.log(
                        WinstonLog.WithdrawTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }   
            const solanaTx = prepareTx.solanaTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: ErrorTransactionType.Withdraw,
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
                                type: ErrorTransactionType.Withdraw,
                            })
                        }
                        this.winstonService.log(
                            WinstonLog.WithdrawTransactionStimulated,
                            {
                                botId: bot.id,
                                txHash: prepareTx.txHash,
                            }
                        )
                        txHashes.push(prepareTx.txHash)
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
                        WinstonLog.WithdrawTransactionExecuted,
                        {
                            botId: bot.id,
                            txHash: transactionSignature.toString(),
                        }
                    )
                    txHashes.push(prepareTx.txHash)
                },
            })
        }
        return {
            txHashes,
        }
    }
}

