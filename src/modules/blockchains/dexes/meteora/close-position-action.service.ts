import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
    ExecuteClosePositionResult,
} from "../types"
import {
    SignerService
} from "../../signers"
import {
    AppVersion,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    ClosePositionInstructionService
} from "./transactions"
import {
    ActivePositionNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    PrivyMetadataNotFoundException,
    InvalidPoolTokensException,
    TransactionType,
    MissingSolanaTxParamException,
    TransactionSubmitFailedException,
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
} from "@modules/exceptions"
import {
    RpcExecutorService
} from "../../clients"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    compileTransaction,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    signature,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    signTransaction,
    createNoopSigner,
    address,
    getBase64EncodedWireTransaction,
} from "@solana/kit"
import {
    PrivySignService
} from "@modules/privy"
import {
    DlmmLiquidityPoolState,
    PrepareTx
} from "../../types"
import {
    AsyncService 
} from "@modules/mixin"

/**
 * Service responsible for closing positions on Meteora DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new MeteoraClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class MeteoraClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly signerService: SignerService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - DLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared transaction with signature
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as DlmmLiquidityPoolState
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // Create close position instructions
        const instructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state: _state,
            liquidityPool,
        })
        // Get latest blockhash for transaction lifetime
        const lastedBlockhashResult = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                // Get latest blockhash for transaction lifetime
                return await rpc.getLatestBlockhash().send()
            }
        })
        // Build transaction message
        const transactionMessage = pipe(
            createTransactionMessage({
                version: 0
            }),
            (tx) => setTransactionMessageFeePayerSigner(createNoopSigner(address(bot.accountAddress)),
                tx),
            (tx) => appendTransactionMessageInstructions(instructions,
                tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(lastedBlockhashResult.value,
                tx),
        )
        const transaction = compileTransaction(transactionMessage)

        let prepareTxs: Array<PrepareTx>
        if (bot.version === AppVersion.V1) {
            const prepareTx: PrepareTx = await this.signerService.withSolanaSigner({
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
            // Stimulate before returning
            const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Write,
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
                throw new TransactionStimulatedFailedException(
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        liquidityPoolId: liquidityPool.displayId,
                        type: TransactionType.ClosePosition,
                    }
                )
            }
            prepareTxs = [prepareTx]
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
                    blockhash: lastedBlockhashResult.value.blockhash,
                    lastValidBlockHeight: lastedBlockhashResult.value.lastValidBlockHeight,
                },
                transaction,
                encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                walletId: bot.privyMetadata.walletId,
            })
            const prepareTx: PrepareTx = {
                txHash: signedTransaction.txHash,
                solanaTx: signedTransaction.signedTransaction,
            }
            // Stimulate before returning
            const simulateResult = await this.rpcExecutorService.withSolanaRpc({
                accessType: RpcAccessType.Write,
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
                throw  new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: prepareTx.txHash,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.ClosePosition,
                }
                )
            }
            prepareTxs = [prepareTx]
        }
        return {
            prepareTxs,
        }
    }

    /**
     * Executes a close position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - Dynamic CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with transaction hashes
     * @throws {MissingSolanaTxParamException} If the Solana transaction is missing
     * @throws {TransactionValidationFailedException} If transaction simulation fails
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        prepareTxs,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise < ExecuteClosePositionResult > {
        const txHashes: Array<string> =[]

        // Process each prepared transaction
        for(const prepareTx of prepareTxs) {
        // Stage: transaction checking (if txCheck is enabled and not stimulating)
            if (txCheck && !stimulate) {
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Http,
                    callback: async ({ rpc }) => {
                        return await rpc.getTransaction(
                            signature(prepareTx.txHash),
                            {
                                commitment: "confirmed",
                                encoding: "base58",
                            },
                        ).send()
                    },
                })

                // If transaction already executed, log and continue
                if (transaction) {
                    this.winstonService.log(
                        WinstonLog.ClosePositionTransactionFound,
                        {
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId: liquidityPool.displayId,
                        },
                    )
                    txHashes.push(prepareTx.txHash)
                    continue
                }
            }

            // Stage: transaction validation (Solana transaction must exist)
            const { solanaTx } = prepareTx
            if (!solanaTx) {
                throw new MissingSolanaTxParamException({
                    botId: bot.id,
                    type: TransactionType.ClosePosition,
                })
            }
            if (stimulate) {
                const transaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Write,
                    callback: async ({ rpc }) => {
                    // Simulate transaction execution
                        return await rpc.simulateTransaction(
                            getBase64EncodedWireTransaction(solanaTx),
                            {
                                encoding: "base64",
                                commitment: "confirmed",
                            },
                        ).send()
                    },
                })
                // Stage: transaction stimulation validation
                if (transaction.value.err) {
                    throw new TransactionSubmitFailedException({
                        message: transaction.value.err.toString(),
                        originalError: new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: prepareTx.txHash,
                            liquidityPoolId: liquidityPool.displayId,
                            type: TransactionType.ClosePosition,
                        })
                    })
                }
                // Log successful simulation
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionStimulated,
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    },
                )
                txHashes.push(prepareTx.txHash)
            } else {
                // Execute transaction on-chain
                const sendAndConfirmTransaction = await this.rpcExecutorService.withSolanaRpc({
                    accessType: RpcAccessType.Write,
                    callback: async ({ rpc, rpcSubscriptions }) => {
                        return sendAndConfirmTransactionFactory({
                            rpc,
                            rpcSubscriptions,
                        })
                    }
                },
                )
                const [, error] = await this.asyncService.resolveTuple(
                    sendAndConfirmTransaction(
                        solanaTx,
                        {
                            commitment: "confirmed",
                        },
                    )
                )
                if (error) {
                    throw new TransactionSubmitFailedException(
                        {
                            message: error.toString(),
                            originalError: new TransactionExecutionFailedException(
                                {
                                    botId: bot.id,
                                    txHash: prepareTx.txHash,
                                    liquidityPoolId: liquidityPool.displayId,
                                    type: TransactionType.ClosePosition,
                                }
                            )
                        }
                    )
                }
                // Log successful execution
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: prepareTx.txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    },
                )
                txHashes.push(prepareTx.txHash)
            }
        }
        return {
            txHashes,
        }
    }
}
