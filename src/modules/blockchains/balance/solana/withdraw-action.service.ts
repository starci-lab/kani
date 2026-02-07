import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
} from "../types"
import {
    PrepareTx
} from "../../types"
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
    TransactionType,
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

/**
 * Service for handling withdraw transactions on Solana.
 * Supports withdrawing tokens directly or converting to USDC before withdrawal.
 *
 * @example
 * const service = new SolanaWithdrawActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress })
 * const txHashes = await service.execute({ bot, prepareTxs })
 */
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

    /**
     * Prepares withdraw transactions.
     * Optionally converts tokens to USDC before withdrawal.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress, toUsdc: true })
     */
    public async prepare({ bot, tokenInputs, toAddress, toUsdc = false }: PrepareWithdrawTransactionParams): Promise<PrepareWithdrawTransactionResult> {
        const prepareTxs: Array<PrepareTx> = []
        for (const tokenInput of tokenInputs) {
            const instructions: Array<Instruction> = []
            
            if (toUsdc) {
                // find USDC token
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
                
                // swap to USDC if token is not already USDC
                if (tokenInput.token.displayId !== TokenId.SolUsdc) {
                    const { response: { payload: serializedTransaction } } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: usdcToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })
                    // decode and decompile swap transaction
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
                    
                    // add swap instructions
                    const swapInstructions = swapTransactionMessage.instructions
                    instructions.push(...swapInstructions)
                }
            } else {
                // find target token for conversion
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
                
                // swap to target token if needed
                if (tokenInput.token.displayId !== targetToken.displayId) {
                    const { response: { payload: serializedTransaction } } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: targetToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })
                    
                    // decode and decompile swap transaction
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
                    
                    // add swap instructions
                    const swapInstructions = swapTransactionMessage.instructions
                    instructions.push(...swapInstructions)
                }
            }
            
            // create transfer instructions
            const { instructions: transferInstructions } = await this.transferInstructionService.createTransferInstructions({
                fromAddress: address(bot.accountAddress),
                toAddress: address(toAddress),
                amount: tokenInput.amount,
                token: tokenInput.token,
            })
            instructions.push(...transferInstructions)
            
            // build and sign transaction
            const transaction = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    // get latest blockhash for transaction lifetime
                    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                    // build transaction message with all instructions
                    const transactionMessage = pipe(
                        createTransactionMessage({
                            version: 0 
                        }),
                        (tx) => setTransactionMessageFeePayerSigner(
                            createNoopSigner(address(bot.accountAddress)),
                            tx),
                        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash,
                            tx),
                        (tx) => appendTransactionMessageInstructions(instructions,
                            tx),
                    )
                    const compiledTransaction = compileTransaction(transactionMessage)
                    
                    // sign transaction based on bot version
                    if (bot.version === AppVersion.V1) {
                        return await this.signerService.withSolanaSigner({
                            bot,
                            action: async (signer) => {
                                const signedTransaction = await signTransaction(
                                    [signer.keyPair],
                                    compiledTransaction,
                                ) 
                                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                                const txHash = transactionSignature.toString()
                                
                                // validate transaction before returning
                                assertIsSendableTransaction(signedTransaction)
                                assertIsTransactionWithinSizeLimit(signedTransaction)
                                
                                return {
                                    txHash,
                                    solanaTx: signedTransaction,
                                }
                            },
                        })
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
     * Executes withdraw transactions.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHashes = await service.execute({ bot, prepareTxs })
     */
    public async execute({ bot, prepareTxs, isRetry = false, stimulate = false }: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        const txHashes: Array<string> = []
        for (const prepareTx of prepareTxs) {
            // check if transaction already exists on chain (for retries)
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
                
                // skip if transaction already exists
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
            
            // validate transaction exists
            const { solanaTx } = prepareTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: TransactionType.Withdraw,
                })
            }
            
            // execute or simulate transaction
            await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Write,
                callback: async ({ rpc, rpcSubscriptions }) => {
                    if (stimulate) {
                        // simulate transaction without sending
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
                                type: TransactionType.Withdraw,
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
                    
                    // send and confirm transaction
                    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                        rpc,
                        rpcSubscriptions,
                    })
                    const transactionSignature = getSignatureFromTransaction(solanaTx)
                    await sendAndConfirmTransaction(solanaTx,
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

