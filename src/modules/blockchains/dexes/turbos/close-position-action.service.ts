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
    PrivyPublicKeyNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    ErrorTransactionType,
    TransactionValidationFailedException,
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

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
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
                    return await this.signerService.withSuiSigner(
                        {
                            bot,
                            action: async (signer) => {
                                const bytes = await closePositionTxb.build({
                                    client: suiClient,
                                })
                                const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                                const signatureWithBytes = await signer.signTransaction(bytes)
                                this.winstonService.log(
                                    WinstonLog.ClosePositionTransactionPrepared,
                                    {
                                        botId: bot.id,
                                        txHashes: [txHash],
                                        liquidityPoolId: _state.static.displayId,
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
                            },
                        }
                    )
                } else {
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
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey!,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId!,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload!,
                    })
                    this.winstonService.log(
                        WinstonLog.ClosePositionTransactionPrepared,
                        {
                            botId: bot.id,
                            txHashes: [txHash],
                            liquidityPoolId: _state.static.displayId,
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
            },
        })
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
        // Stage: state validation (close requires an active position)
        if (txCheck && !stimulate) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return suiClient.getTransactionBlock({
                            digest: txHash,
                        })
                    },
                })
            )
            if (txBlock !== null && !txBlock.errors) {
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
                    const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                    const devInspect = await suiClient.devInspectTransactionBlock({
                        transactionBlock,
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
                const { digest } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                })
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
