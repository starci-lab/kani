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
} from "../../interfaces"
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
    TransactionValidationFailedException,
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    ErrorTransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
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
    AsyncService 
} from "@modules/mixin"
import {
    PrivySignService 
} from "@modules/privy"
import {
    AppVersion 
} from "@modules/databases"
import {
    WinstonService, WinstonLog
} from "@modules/winston"

@Injectable()
export class FlowXClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) { }

    /**
     * === Error-handling convention (DEX action services) ===
     *
     * Stages in this service:
     * - Input validation: required params missing/invalid (throw immediately)
     * - State validation: required bot/pool/position state missing (throw immediately)
     * - Transaction building/validation: dev-inspect/build/sign failures (throw)
     * - Execution: tx not executed / retry checks fail (throw)
     *
     * Business logic unchanged; comments + throw structure only.
     */

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const _state = state as ClmmLiquidityPoolState
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
                                    liquidityPoolId: _state.static.displayId,
                                    type: ErrorTransactionType.ClosePosition,
                                })
                            }
                            const bytes = await closePositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            return {
                                prepareTxs: [
                                    {
                                        txHash,
                                        signatureWithBytes,
                                    },
                                ],
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
                        throw new EncryptedPrivySignerPrivateKeyNotFoundException(
                            {
                                botId: bot.id,
                            }
                        )
                    }
                    const { 
                        txHash, 
                        signatureWithBytes 
                    } = await this.privySignService.signSuiTransaction(
                        {
                            publicKeyHex: bot.privyMetadata.walletPublicKey,
                            client: suiClient,
                            walletId: bot.privyMetadata.walletId,
                            transaction: closePositionTxb,
                            encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        }
                    )
                    return {
                        prepareTxs: [
                            {
                                txHash,
                                signatureWithBytes,
                            },
                        ],
                    }
                }
            }
        }
        )
    }

    async execute(
        {
            bot,
            state,
            txCheck,
            stimulate,
            prepareTxs,
        }: ExecuteClosePositionParams
    ): Promise<ExecuteClosePositionResult> {
        // Sui requires exactly one transaction per execution
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.ClosePosition,
                numTxs: prepareTxs.length,
            })
        }
        const [prepareTx] = prepareTxs
        const txHash = prepareTx.txHash
        const signatureWithBytes = prepareTx.signatureWithBytes
        const _state = state as ClmmLiquidityPoolState
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
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException(
                {
                    type: ErrorTransactionType.ClosePosition,
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (stimulate) {
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
