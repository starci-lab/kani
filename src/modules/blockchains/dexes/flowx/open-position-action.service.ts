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
    ClmmLiquidityPoolState,
} from "../../interfaces"
import {
    Transaction, TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SignerService 
} from "../../signers"
import BN from "bn.js"
import {
    AppVersion, BotSchema, DexId, PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    OpenPositionTxbService,
} from "./transactions"
import {
    TickMathService,
} from "../../math"
import {
    InvalidPoolTokensException,
    BalanceSnapshotsNotFoundException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionValidationFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
    ErrorTransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
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
    SuiEvent 
} from "@mysten/sui/client"
import {
    FlowXClmmPosition 
} from "./struct"
import {
    PrivySignService 
} from "@modules/privy"
import Decimal from "decimal.js"

@Injectable()
export class FlowXOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly winstonService: WinstonService,
        private readonly privySignService: PrivySignService,
    ) { }
    
    /**
     * === Error-handling convention (DEX action services) ===
     *
     * Stages in this service:
     * - Input validation: required params missing/invalid (throw immediately)
     * - State validation: required bot/pool state missing (throw immediately)
     * - On-chain fetch: RPC returns missing/invalid objects (throw)
     * - Transaction building/validation: dev-inspect/build/sign failures (throw)
     * - Execution: tx not executed / retry checks fail (throw)
     * - Event parsing: expected events missing/unparseable (throw)
     *
     * Business logic unchanged; comments + throw structure only.
     */

    async confirm(
        { positionId, state  }: ConfirmOpenPositionParams
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
                // Stage: on-chain fetch validation (position object must exist)
                if (objectInfo.error || !objectInfo.data) {
                    throw new SuiObjectNotFoundException(
                        {
                            name: ErrorSuiObjectName.Position,
                            id: positionId,
                            dexId: DexId.FlowX,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                }
                // Stage: on-chain fetch validation (object must be a Move object)
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException(
                        {
                            name: ErrorSuiObjectName.Position,
                            id: positionId,
                            dexId: DexId.FlowX,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                }
                const fields = objectInfo.data.content.fields as unknown as FlowXClmmPosition
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
        if (
            !bot.balanceSnapshots
        ) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const { tickLower, tickUpper } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.dynamic.tickCurrent,
            tickSpacing: new Decimal(_state.static.clmmState.tickSpacing),
            tickMultiplier: new Decimal(_state.static.clmmState.tickMultiplier),
            targetBalanceAmount: new BN(snapshotTargetBalanceAmount),
            quoteBalanceAmount: new BN(snapshotQuoteBalanceAmount),
            targetIsA,
        })
        const {
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            txb,
            bot,
            amountA: snapshotTargetBalanceAmount,
            amountB: snapshotQuoteBalanceAmount,
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
                        // dev inspect the transaction block
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: openPositionTxb,
                                sender: bot.accountAddress,
                            })
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException({
                                    botId: bot.id,
                                    txHash: devInspect.effects.transactionDigest,
                                    liquidityPoolId: _state.static.displayId,
                                    type: ErrorTransactionType.OpenPosition,
                                })
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
                        publicKeyHex: bot.privyMetadata?.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata?.walletId,
                        transaction: openPositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionPrepared,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    return {
                        txHash,
                        signatureWithBytes,
                        feeAmountA,
                        feeAmountB,
                        tickLower,
                        tickUpper,
                    }
                }
            }
        })
    }

    async execute({
        bot,
        state,
        txCheck,
        stimulate,
        txHash,
        signatureWithBytes,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
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
            if (txBlock !== null && !txBlock.errors) {
                const { positionId } = this.parseIncreaseLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: txBlock?.events || [],
                })
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionFound,
                    {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                return {
                    positionId,
                }
            }
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
                            type: ErrorTransactionType.OpenPosition,
                        })
                    }
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionPrepared,
                        {
                            botId: bot.id,
                            txHash: devInspect.effects.transactionDigest,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    const { positionId } = this.parseIncreaseLiquidityEvent({
                        state: _state,
                        bot,
                        txHash,
                        events: devInspect.events || [],
                    })
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    return {
                        positionId,
                    }
                }
                const { digest, events } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                    },
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
                const { positionId } = this.parseIncreaseLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: events || [],
                })
                return {
                    positionId,
                }
            },
        })
    }

    private parseIncreaseLiquidityEvent(
        {
            state,
            bot,
            txHash,
            events,
        }: ParseIncreaseLiquidityEventParams
    ): ParseIncreaseLiquidityEventResult {
        const eventType = "::position_manager::IncreaseLiquidity"
        const event = events?.find((event) =>
            event.type.includes(eventType),
        )
        if (!event) {
            throw new TransactionEventNotFoundException(
                {
                    botId: bot.id,
                    txHash,
                    eventType,
                    liquidityPoolId: state.static.displayId,
                }
            )
        }
        const parsed = event.parsedJson as IncreaseLiquidityEvent
        return {
            positionId: parsed.position_id,
        }
    }
}

interface IncreaseLiquidityEvent {
    amount_x: string
    amount_y: string
    liquidity: string
    pool_id: string
    position_id: string
    sender: string
}

interface ParseIncreaseLiquidityEventResult {
    positionId: string
}

interface ParseIncreaseLiquidityEventParams {
    state: ClmmLiquidityPoolState
    events?: Array<SuiEvent>
    bot: BotSchema
    txHash: string
}