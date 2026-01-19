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
    SnapshotBalancesNotSetException,
    TransactionEventNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    TransactionValidationFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectInvalidTypeException,
    ErrorSuiObjectName,
    EnsureCalculationException,
    EnsureRangeType,
    ErrorTransactionType,
    SuiObjectNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
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
    Network, TurbosSdk 
} from "turbos-clmm-sdk"
import {
    EnsureMathService 
} from "../../math"
import {
    toScaledBN 
} from "@modules/utils"
import {
    AsyncService 
} from "@modules/mixin"
import {
    SuiEvent 
} from "@mysten/sui/client"
import {
    MintNftEvent, parseTurbosSuiObjectPositionNFT, TurbosClmmPosition, TurbosSuiObjectPositionNFT 
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
        private readonly ensureMathService: EnsureMathService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) {}
    
    async confirm(
        { positionId, state }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
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
                if (positionNftObjectInfo.error || !positionNftObjectInfo.data) {
                    throw new SuiObjectNotFoundException({
                        name: ErrorSuiObjectName.PositionNFT,
                        id: positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                if (positionNftObjectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        name: ErrorSuiObjectName.PositionNFT,
                        id: positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                const positionNftFields = positionNftObjectInfo.data.content.fields as unknown as TurbosSuiObjectPositionNFT
                const turbosPositionNFT = parseTurbosSuiObjectPositionNFT(positionNftFields)
                const clmmPosition = await suiClient.getObject({
                    id: turbosPositionNFT.positionId,
                    options: {
                        showContent: true,
                    }
                })
                if (clmmPosition.error || !clmmPosition.data) {
                    throw new SuiObjectNotFoundException({
                        name: ErrorSuiObjectName.Position,
                        id: turbosPositionNFT.positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                if (clmmPosition.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        name: ErrorSuiObjectName.PositionNFT,
                        id: turbosPositionNFT.positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: _state.static.displayId,
                    })  
                }
                const clmmPositionFields = clmmPosition.data.content.fields as unknown as TurbosClmmPosition
                return {
                    liquidity: new BN(clmmPositionFields.liquidity),
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
        let amountA = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        let amountB = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
        const sdk = new TurbosSdk(Network.mainnet)
        const [, actualAmountB] = sdk.pool.estimateAmountsFromOneAmount({
            isAmountA: true,
            amount: amountA.toString(),
            sqrtPrice: sdk.math.tickIndexToSqrtPriceX64(new BN(_state.dynamic.tickCurrent).toNumber()).toString(),
            tickLower: tickLower.toNumber(),
            tickUpper: tickUpper.toNumber(),
        })
        const lowerBound = new Decimal(1).sub(new Decimal(envConfig().dexes.turbos.openPosition.slippage))
        const upperBound = new Decimal(1).add(new Decimal(envConfig().dexes.turbos.openPosition.slippage))
        const actual = new BN(actualAmountB)
        const { isAcceptable, ratio } = this.ensureMathService.ensureBetween({
            expected: amountB,
            actual,
            upperBound,
            lowerBound,
        })
        if (!isAcceptable) {
            throw new EnsureCalculationException(
                {
                    expected: amountB,
                    actual,
                    rangeType: EnsureRangeType.Between,
                    lowerBound,
                    upperBound,
                }
            )
        }
        if (ratio.gt(new Decimal(1))) {
            amountB = new BN(actualAmountB)
            amountA = toScaledBN(amountA,
                new Decimal(1).div(ratio))
        }
        const { 
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            liquidity: new BN(0),
            amountAMax: amountA,
            amountBMax: amountB,
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
                        publicKeyHex: bot.privyMetadata?.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata?.walletId,
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
            },
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
                const { positionId } = this.parseMintEvents({
                    bot,
                    txHash,
                    state: _state,
                    events: txBlock?.events || [],
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