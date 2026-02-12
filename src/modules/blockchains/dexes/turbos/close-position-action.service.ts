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
    Transaction,
    TransactionDataBuilder
} from "@mysten/sui/transactions"
import {
    SignerService
} from "../../signers"
import {
    ClosePositionTxbService,
} from "./transactions"
import {
    ActivePositionNotFoundException,
    TransactionNotPreparedException,
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    TransactionType,
    TransactionValidationFailedException,   
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
    TransactionSubmitFailedException,
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
    AsyncService
} from "@modules/mixin"
import {
    PrivySignService
} from "@modules/privy"
import {
    AppVersion
} from "@modules/databases"
import {
    ClmmLiquidityPoolState 
} from "../../types"

/**
 * Service responsible for closing positions on Turbos DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new TurbosClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class TurbosClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with signature
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare({
        bot,
        state,
        liquidityPool,
    }: PrepareClosePositionParams): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        
        // create close position transaction builder
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
            liquidityPool,
        })
        
        if (bot.version === AppVersion.V1) {
            // dev inspect the transaction block
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock: closePositionTxb,
                        sender: bot.accountAddress,
                    })
                },
            })
            
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionValidationFailedException({
                    botId: bot.id,
                    txHash: devInspect.effects.transactionDigest,
                    type: TransactionType.ClosePosition,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            
            // build transaction bytes
            const bytes = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await closePositionTxb.build({
                        client: suiClient,
                    })
                },
            })
            
            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
            
            // sign transaction
            const signatureWithBytes = await this.signerService.withSuiSigner({
                bot,
                action: async (signer) => {
                    return await signer.signTransaction(bytes)
                },
            })
            
            return {
                prepareTxs: [{
                    txHash,
                    signatureWithBytes,
                }],
            }
        } else {
            // Stage: state validation (privy signing prerequisites)
            if (!bot.privyMetadata?.walletPublicKey) {
                throw new PrivyPublicKeyNotFoundException({
                    botId: bot.id,
                })
            }
            if (!bot.privyMetadata?.walletId) {
                throw new PrivyPublicKeyNotFoundException({
                    botId: bot.id,
                })
            }
            if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                    botId: bot.id,
                })
            }
            
            // store validated values for use in callback
            const privyMetadata = bot.privyMetadata
            const encryptedPrivySignerPrivateKey = bot.encryptedPrivySignerPrivateKeyPayload
            
            // sign transaction with Privy
            const { txHash, signatureWithBytes } = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await this.privySignService.signSuiTransaction({
                        publicKeyHex: privyMetadata.walletPublicKey!,
                        client: suiClient,
                        walletId: privyMetadata.walletId!,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: encryptedPrivySignerPrivateKey,
                    })
                },
            })
            
            return {
                prepareTxs: [{
                    txHash,
                    signatureWithBytes,
                }],
            }
        }
    }

    /**
     * Executes a close position transaction.
     * Validates transaction, optionally checks existing transaction, and executes or simulates.
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check for existing transaction
     * @param param.stimulate - Whether to simulate transaction instead of executing
     * @param param.prepareTxs - Prepared transactions to execute
     * @returns Execution result with transaction hashes
     *
     * @example
     * const result = await service.execute({ bot, state, txCheck: true, prepareTxs })
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        prepareTxs,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Sui requires exactly one transaction per execution
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.ClosePosition,
                numTxs: prepareTxs.length,
            })
        }
        
        // extract prepared transaction
        const [prepareTx] = prepareTxs
        const txHash = prepareTx.txHash
        const signatureWithBytes = prepareTx.signatureWithBytes
        
        // check if transaction already exists on-chain
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
        
        // validate transaction is prepared
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: liquidityPool.displayId,
                type: TransactionType.ClosePosition,
            })
        }
        
        if (stimulate) {
            // simulate transaction execution
            const transactionBlock = Transaction.from(signatureWithBytes.bytes)
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                },
            })
            
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionSubmitFailedException({
                    originalError: new TransactionStimulatedFailedException({
                        botId: bot.id,
                        txHash: devInspect.effects.transactionDigest,
                        liquidityPoolId: liquidityPool.displayId,
                        type: TransactionType.ClosePosition,
                    }),
                    message: devInspect.effects.status.error ?? "Unknown error",
                })
            }
            
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
        
        // execute transaction on-chain
        const { digest, effects } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEffects: true,
                    },
                })
            },
        })
        
        if (effects?.status?.status !== "success") {
            throw new TransactionSubmitFailedException({
                originalError: new TransactionExecutionFailedException({
                    botId: bot.id,
                    txHash: digest,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.ClosePosition,
                }),
                message: effects?.status?.error ?? "Unknown error",
            })
        }
        
        // wait for transaction confirmation
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })
        
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
    }
}
