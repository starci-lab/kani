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
    ClmmLiquidityPoolState,
} from "../../types"
import {
    Transaction,
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SignerService 
} from "../../signers"
import {
    ClosePositionTxbService 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    TransactionNotPreparedException,
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    TransactionType,
    TransactionStimulatedFailedException,
    TransactionValidationFailedException,
    TransactionExecutionFailedException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
} from "@modules/exceptions"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    AsyncService 
} from "@modules/mixin"
import {
    PrivySignService 
} from "@modules/privy"
import {
    AppVersion 
} from "@modules/databases"

/**
 * Service responsible for closing positions on Momentum DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new MomentumClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class MomentumClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with signature
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {TransactionValidationFailedException} If transaction dev inspect fails
     * @throws {PrivyPublicKeyNotFoundException} If Privy wallet public key is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState

        // Stage: state validation (close requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        // Create the close position transaction block
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
        })

        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            // Dev inspect the transaction block to validate
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: closePositionTxb,
                                sender: bot.accountAddress,
                            })
                            // Stage: transaction validation (dev inspect must succeed)
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException({
                                    botId: bot.id,
                                    txHash: devInspect.effects.transactionDigest,
                                    type: TransactionType.ClosePosition,
                                    liquidityPoolId: liquidityPool.displayId,
                                })
                            }
                            // Build and sign the transaction
                            const bytes = await closePositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            return {
                                prepareTxs: [{
                                    txHash,
                                    signatureWithBytes,
                                }],
                            }
                        },
                    })
                } else {
                    // Stage: state validation (Privy signing prerequisites for V2 bots)
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
                    // Sign transaction using Privy service
                    const {
                        txHash,
                        signatureWithBytes
                    } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    return {
                        prepareTxs: [{
                            txHash,
                            signatureWithBytes,
                        }],
                    }
                }
            },
        })
    }

    /**
     * Executes a close position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with transaction hashes
     * @throws {SuiSingleTransactionRequiredException} If more than one transaction is provided for Sui
     * @throws {TransactionNotPreparedException} If the transaction signature is missing
     * @throws {TransactionStimulatedFailedException} If transaction stimulation fails
     * @throws {TransactionExecutionFailedException} If transaction execution fails
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        prepareTxs,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Sui requires exactly 1 transaction per execution
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.ClosePosition,
                numTxs: prepareTxs.length,
            })
        }

        // Extract transaction details
        const [prepareTx] = prepareTxs
        const {
            txHash,
            signatureWithBytes
        } = prepareTx
        // Stage: transaction checking (if txCheck is enabled and not stimulating)
        if (txCheck && !stimulate) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return suiClient.getTransactionBlock({
                            digest: txHash,
                            options: {
                                showEffects: true,
                            },
                        })
                    },
                })
            )

            // If transaction already executed successfully, log and return
            if (txBlock !== null && txBlock.effects?.status?.status === "success") {
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionFound,
                    {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
                return {
                    txHashes: [txHash],
                }
            }
        }

        // Stage: transaction validation (signature must exist)
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: liquidityPool.displayId,
                type: TransactionType.ClosePosition,
            })
        }

        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (stimulate) {
                    // Simulate transaction execution
                    const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                    const devInspect = await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })

                    // Stage: transaction stimulation validation
                    if (devInspect.effects.status.status !== "success") {
                        throw new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: devInspect.effects.transactionDigest,
                            liquidityPoolId: liquidityPool.displayId,
                            type: TransactionType.ClosePosition,
                        })
                    }

                    // Log successful simulation
                    this.winstonService.log(
                        WinstonLog.ClosePositionTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: liquidityPool.displayId,
                        }
                    )
                    return {
                        txHashes: [txHash],
                    }
                }

                // Execute transaction on-chain
                const {
                    digest,
                    effects
                } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEffects: true,
                    },
                })

                // Stage: transaction execution validation
                if (effects?.status?.status !== "success") {
                    throw new TransactionExecutionFailedException({
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }

                // Wait for transaction confirmation
                await suiClient.waitForTransaction({
                    digest,
                })

                // Log successful execution
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
                return {
                    txHashes: [digest],
                }
            },
        })
    }
}
