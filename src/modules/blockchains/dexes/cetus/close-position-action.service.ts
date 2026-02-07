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
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    TransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
    TransactionValidationFailedException,
} from "@modules/exceptions"
import {
    RpcExecutorService 
} from "@modules/blockchains"
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
    AppVersion 
} from "@modules/databases"
import {
    PrivySignService 
} from "@modules/privy"
import {
    ClmmLiquidityPoolState 
} from "../../types"

/**
 * Service responsible for closing positions on Cetus DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new CetusClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class CetusClosePositionActionService implements IClosePositionActionService {
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
     * @param param.liquidityPool - Liquidity pool schema
     * @returns Prepared transaction with signature
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare({ bot, state, liquidityPool }: PrepareClosePositionParams): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
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
                                throw new TransactionValidationFailedException(
                                    {
                                        type: TransactionType.ClosePosition,
                                        botId: bot.id,
                                        txHash: devInspect.effects.transactionDigest,
                                        liquidityPoolId: liquidityPool.displayId,
                                    }
                                )
                            }
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
                        throw new PrivyPublicKeyNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction(
                        {
                            publicKeyHex: bot.privyMetadata.walletPublicKey,
                            client: suiClient,
                            walletId: bot.privyMetadata.walletId,
                            transaction: closePositionTxb,
                            encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        }
                    )
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
     *
     * @example
     * const result = await service.execute({ bot, state, prepareTxs, txCheck, stimulate })
     */
    async execute({ bot, txCheck, prepareTxs, stimulate, liquidityPool }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Sui requires exactly 1 transaction
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.ClosePosition,
                numTxs: prepareTxs.length,
            })
        }
        // extract transaction details
        const [prepareTx] = prepareTxs
        const { txHash, signatureWithBytes } = prepareTx
        
        // check if transaction already exists on-chain
        if (txCheck && !stimulate) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return suiClient.getTransactionBlock({
                            digest: txHash,
                            options: {
                                showEvents: true,
                            }
                        })
                    },
                })
            )
            
            // return if transaction already executed successfully
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
        
        // validate signature exists
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
                    // simulate transaction execution
                    const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                    const devInspect = await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                    
                    // validate simulation results
                    if (devInspect.effects.status.status !== "success") {
                        throw new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: devInspect.effects.transactionDigest,
                            liquidityPoolId: liquidityPool.displayId,
                            type: TransactionType.ClosePosition,
                        })
                    }
                    
                    // log successful simulation
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
                const { digest, effects } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEffects: true,
                    },
                })
                
                // validate execution results
                if (effects?.status?.status !== "success") {
                    throw new TransactionExecutionFailedException({
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                
                // wait for transaction confirmation
                await suiClient.waitForTransaction({
                    digest,
                })
                
                // log successful execution
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
