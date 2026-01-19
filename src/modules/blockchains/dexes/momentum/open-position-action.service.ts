import {
    Injectable 
} from "@nestjs/common"
import {
    IOpenActionService,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
} from "../../interfaces"
import {
    Transaction, TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SignerService 
} from "../../signers"
import BN from "bn.js"
import { 
    AppVersion, BotSchema, DexId, PrimaryMemoryStorageService
} from "@modules/databases"
import {
    OpenPositionTxbService 
} from "./transactions"
import {
    TickMathService 
} from "../../math"
import { 
    InvalidPoolTokensException, 
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    TransactionValidationFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
    ErrorTransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
} from "@exceptions"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    AsyncService 
} from "@modules/mixin"
import {
    SuiEvent 
} from "@mysten/sui/client"
import {
    MomentumClmmPosition 
} from "./struct"
import {
    PrivySignService 
} from "@modules/privy"
import {
    ClmmLiquidityPoolState 
} from "../../interfaces"

@Injectable()
export class MomentumOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly winstonService: WinstonService,
        private readonly privySignService: PrivySignService,
    ) {}
    
    async confirm(
        { positionId, state }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                const objectInfo = await suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    }
                })
                if (objectInfo.error || !objectInfo.data) {
                    throw new SuiObjectNotFoundException({
                        name: ErrorSuiObjectName.Position,
                        id: positionId,
                        dexId: DexId.Momentum,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        name: ErrorSuiObjectName.Position,
                        id: positionId,
                        dexId: DexId.Momentum,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                const fields = objectInfo.data.content.fields as unknown as MomentumClmmPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }

    async prepare(
        {
            bot,
            state,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        const txb = new Transaction()
        if (!bot.snapshots) {
            throw new SnapshotBalancesNotSetException({
                botId: bot.id,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.snapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.snapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }       
        const targetIsA = bot.targetToken.toString() === tokenA.id
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state: _state,
            bot,
        })
        const amountA = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const amountB = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
        const { 
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountA,
            amountB,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            tickUpper,
        })
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: openPositionTxb,
                                sender: bot.accountAddress,
                            })
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException(
                                    {
                                        botId: bot.id,
                                        txHash: devInspect.effects.transactionDigest,
                                        liquidityPoolId: _state.static.displayId,
                                        type: ErrorTransactionType.OpenPosition,
                                    }
                                )
                            }
                            const bytes = await openPositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            return {
                                txHash,
                                signatureWithBytes,
                                feeAmountA,
                                feeAmountB,
                                tickLower,
                                tickUpper,
                                amountA,
                                amountB,
                            }
                        },
                    })
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
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: openPositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    return {
                        txHash,
                        signatureWithBytes,
                        feeAmountA,
                        feeAmountB,
                        tickLower,
                        tickUpper,
                        amountA,
                        amountB,
                    }
                }
            }
        })
    }

    async execute({
        bot,
        state,
        isRetry,
        txHash,
        signatureWithBytes,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        if (isRetry) {
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
            if (txBlock !== null) {
                const { positionId } = this.parseAddLiquidityEvent({
                    events: txBlock?.events || [],
                    bot,
                    txHash,
                    state: _state,
                })
                return {
                    positionId,
                }
            }
            throw new TransactionNotExecutedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: _state.static.displayId,
                type: ErrorTransactionType.OpenPosition,
            })
        }
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: _state.static.displayId,
                type: ErrorTransactionType.OpenPosition,
            })
        }
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                const { digest, events } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                    }
                })
                await suiClient.waitForTransaction({
                    digest,
                })
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                const { positionId } = this.parseAddLiquidityEvent(
                    {
                        events: events || [],
                        bot,
                        txHash,
                        state: _state,
                    }
                )
                return {
                    positionId,
                }
            },
        })
    }

    private parseAddLiquidityEvent(
        { events, bot, txHash, state }: ParseAddLiquidityEventParams
    ): ParseAddLiquidityEventResult {
        const _state = state as ClmmLiquidityPoolState
        const eventType = "::liquidity::AddLiquidityEvent"
        const event = events?.find(
            event => event.type.includes(eventType)
        )
        if (!event) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const parsed = event.parsedJson as AddLiquidityEvent
        return {
            positionId: parsed.position_id,
        }
    }
}

interface AddLiquidityEvent {
    amount_x: string
    amount_y: string
    liquidity: string
    pool_id: string
    position_id: string
    reserve_x: string
    reserve_y: string
    sender: string
}

interface ParseAddLiquidityEventResult {
    positionId: string
}

interface ParseAddLiquidityEventParams {
    events?: Array<SuiEvent>
    bot: BotSchema
    txHash: string
    state: ClmmLiquidityPoolState
}