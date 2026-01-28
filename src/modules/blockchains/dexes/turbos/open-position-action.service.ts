import {
    Injectable 
} from "@nestjs/common"
import {
    IOpenActionService,
    ClmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
} from "../../interfaces"
import {
    Transaction,
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SignerService 
} from "../../signers"
import BN from "bn.js"
import { 
    AppVersion,
    BotSchema,
    DexId,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    OpenPositionTxbService 
} from "./transactions"
import {
    TickMathService
} from "../../math"
import { 
    InvalidPoolTokensException, 
    BalanceSnapshotsNotFoundException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionValidationFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectInvalidTypeException,
    ErrorSuiObjectName,
    ErrorTransactionType,
    SuiObjectNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    SlippageToleranceExceededException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
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
    MintNftEvent, parseTurbosSuiObjectPositionNFT, TurbosClmmPosition, TurbosSuiObjectPositionNFTFields 
} from "./struct"
import {
    envConfig 
} from "@modules/env"
import {
    PrivySignService 
} from "@modules/privy"
        
@Injectable()
export class TurbosOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) {}
    
    /**
     * === Error-handling convention (DEX action services) ===
     *
     * This service uses staged errors to clarify failure points:
     * - Input validation: required params missing/invalid (throw immediately)
     * - State validation: required bot/pool state missing (throw immediately)
     * - On-chain fetch: RPC returns missing/invalid objects (throw)
     * - Transaction building/validation: dev-inspect/build/sign failures (throw)
     * - Execution: tx not executed / retry checks fail (throw)
     * - Event parsing: expected events missing (throw)
     *
     * Business logic is unchanged; we only standardize throw structure and add comments.
     */

    async confirm(
        { positionId, state, bot }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        try {
            const _state = state as ClmmLiquidityPoolState
            return await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    const positionNftObjectInfo = await suiClient.getObject({
                        id: positionId,
                        options: {
                            showContent: true,
                        }
                    })
                    // Stage: on-chain fetch validation (Position NFT object must exist)
                    if (positionNftObjectInfo.error || !positionNftObjectInfo.data) {
                        throw new SuiObjectNotFoundException({
                            name: ErrorSuiObjectName.PositionNFT,
                            id: positionId,
                            dexId: DexId.Turbos,
                            liquidityPoolId: _state.static.displayId,
                        })
                    }
                    // Stage: on-chain fetch validation (object must be a Move object)
                    if (positionNftObjectInfo.data.content?.dataType !== "moveObject") {
                        throw new SuiObjectInvalidTypeException({
                            name: ErrorSuiObjectName.PositionNFT,
                            id: positionId,
                            dexId: DexId.Turbos,
                            liquidityPoolId: _state.static.displayId,
                        })
                    }
                    const positionNftFields = positionNftObjectInfo.data.content as unknown as TurbosSuiObjectPositionNFTFields
                    const turbosPositionNFT = parseTurbosSuiObjectPositionNFT(positionNftFields)
                    const clmmPosition = await suiClient.getObject({
                        id: turbosPositionNFT.positionId,
                        options: {
                            showContent: true,
                        }
                    })
                    // Stage: on-chain fetch validation (Position object must exist)
                    if (clmmPosition.error || !clmmPosition.data) {
                        throw new SuiObjectNotFoundException({
                            name: ErrorSuiObjectName.Position,
                            id: turbosPositionNFT.positionId,
                            dexId: DexId.Turbos,
                            liquidityPoolId: _state.static.displayId,
                        })
                    }
                    // Stage: on-chain fetch validation (object must be a Move object)
                    if (clmmPosition.data.content?.dataType !== "moveObject") {
                        throw new SuiObjectInvalidTypeException({
                            name: ErrorSuiObjectName.PositionNFT,
                            id: turbosPositionNFT.positionId,
                            dexId: DexId.Turbos,
                            liquidityPoolId: _state.static.displayId,
                        })  
                    }
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionConfirmed,
                        {
                            botId: bot.id,
                            txHash: positionId,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    const clmmPositionFields = clmmPosition.data.content.fields as unknown as TurbosClmmPosition
                    return {
                        liquidity: new BN(clmmPositionFields.liquidity),
                    }
                },
            })
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async prepare(
        {
            bot,
            state,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (requires balance snapshots for sizing / tick math)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (pool must have CLMM static state)
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
        // Stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }   
        const targetIsA = bot.targetToken.toString() === tokenA.id
        const { 
            tickLower, 
            tickUpper,
            utilizationPercentage,
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.dynamic.tickCurrent,
            tickSpacing: new Decimal(_state.static.clmmState.tickSpacing),
            tickMultiplier: new Decimal(_state.static.clmmState.tickMultiplier),
            targetBalanceAmount: new BN(snapshotTargetBalanceAmount),
            quoteBalanceAmount: new BN(snapshotQuoteBalanceAmount),
            targetIsA,
        })
        const slippage = Decimal(envConfig().dexes.turbos.openPosition.slippage)
        // Stage: state validation (abort if utilization implies slippage beyond tolerance)
        if (utilizationPercentage.lt(
            new Decimal(1)
                .sub(slippage))
        ) {
            throw new SlippageToleranceExceededException({
                slippage: slippage.toNumber(),
            })
        }
        const amountAMax = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const amountBMax = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
        const { 
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            liquidity: new BN(0),
            amountAMax,
            amountBMax,
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
            },
        })
    }

    async execute(
        {
            bot,
            state,
            txCheck,
            txHash,
            signatureWithBytes,
            stimulate,
        }: ExecuteOpenPositionParams
    ): Promise<ExecuteOpenPositionResult> {
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
                const { positionId } = this.parseMintEvents({
                    bot,
                    txHash,
                    state: _state,
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
                        WinstonLog.OpenPositionTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    const { positionId } = this.parseMintEvents({
                        bot,
                        txHash,
                        state: _state,
                        events: devInspect.events || [],
                    })
                    return {
                        positionId,
                    }
                }
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
                const { positionId } = this.parseMintEvents({
                    bot,
                    txHash,
                    state: _state,
                    events: events || [],
                })
                return {
                    positionId,
                }
            },
        })
    }

    private parseMintEvents(
        {
            bot,
            txHash,
            state,
            events,
        }: ParseMintEventsParams
    ): ParseMintEventsResult {
        const _state = state as ClmmLiquidityPoolState
        const eventType = "::position_manager::MintNftEvent"
        const mintNftEvent = events.find(
            event => event.type.includes(eventType)
        )
        if (!mintNftEvent) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const mintNftEventParsed = mintNftEvent.parsedJson as MintNftEvent
        const positionId = mintNftEventParsed.nft_address
        return {
            positionId,
        }
    }
}

interface ParseMintEventsResult {
    positionId: string
}

interface ParseMintEventsParams {
    bot: BotSchema
    txHash: string
    state: ClmmLiquidityPoolState
    events: Array<SuiEvent>
}