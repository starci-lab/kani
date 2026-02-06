import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    ClmmLiquidityPoolState,
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
    ErrorTransactionType,
    TransactionValidationFailedException,   
    TransactionStimulatedFailedException,
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
        state
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
        })
        
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            // dev inspect the transaction block
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: closePositionTxb,
                                sender: bot.accountAddress,
                            })
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException({
                                    botId: bot.id,
                                    txHash: devInspect.effects.transactionDigest,
                                    type: ErrorTransactionType.ClosePosition,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            }
                            
                            // build transaction bytes and sign
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
                    // Stage: state validation (privy signing prerequisites)
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
                    
                    // sign transaction with Privy
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey!,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId!,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload!,
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
        state,
        txCheck,
        stimulate,
        prepareTxs,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        
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
                        liquidityPoolId: _state.static.displayId,
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
                liquidityPoolId: _state.static.displayId,
                type: ErrorTransactionType.ClosePosition,
            })
        }
        
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (stimulate) {
                    // simulate transaction execution
                    const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                    const devInspect = await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                    if (devInspect.effects.status.status !== "success") {
                        throw new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: devInspect.effects.transactionDigest,
                            liquidityPoolId: _state.static.displayId,
                            type: ErrorTransactionType.ClosePosition,
                        })
                    }
                    this.winstonService.log(
                        WinstonLog.ClosePositionTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    return {
                        txHashes: [txHash],
                    }
                }
                
                // execute transaction on-chain
                const { digest, effects } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEffects: true,
                    },
                })
                if (effects?.status?.status !== "success") {
                    throw new TransactionExecutionFailedException({
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                
                // wait for transaction confirmation
                await suiClient.waitForTransaction({
                    digest,
                })
                this.winstonService.log(
                    WinstonLog.ClosePositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                return {
                    txHashes: [digest],
                }
            },
        })
    }
}
