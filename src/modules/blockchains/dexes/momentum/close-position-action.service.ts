import {
    Injectable 
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    ClmmLiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
} from "../../interfaces"
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
    ErrorTransactionType,
    TransactionValidationFailedException,
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
     * === Error-handling convention (DEX action services) ===
     *
     * Stages in this service:
     * - Input validation: required params missing/invalid (throw immediately)
     * - State validation: required bot/pool/position state missing (throw immediately)
     * - Transaction building: build/sign failures (throw)
     * - Execution: tx not executed / retry checks fail (throw)
     *
     * Business logic unchanged; comments + throw structure only.
     */

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition) {
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
                            const bytes = await closePositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            return {
                                txHash,
                                signatureWithBytes,
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
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    return {
                        txHash,
                        signatureWithBytes,
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
            signatureWithBytes, 
            txHash 
        }: ExecuteClosePositionParams
    ): Promise<void> {
        const _state = state as ClmmLiquidityPoolState
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
                return
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
        await this.rpcExecutorService.withSuiClient({
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
                    return
                }
                const { digest } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature
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
            },
        })
    }
}
