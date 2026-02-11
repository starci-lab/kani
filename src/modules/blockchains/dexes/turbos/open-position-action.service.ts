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
} from "../types"
import {
    ClmmLiquidityPoolState
} from "../../types"
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
    PrimaryMemoryStorageService,
    LiquidityPoolSchema
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
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectInvalidTypeException,
    ErrorSuiObjectKind,
    TransactionType,
    SuiObjectNotFoundException,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    SlippageToleranceExceededException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
    TransactionSubmitFailedException,
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
    MintNftEvent, 
    parseTurbosSuiObjectPositionNFT, 
    TurbosClmmPosition, 
    TurbosSuiObjectPositionNFTFields 
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
        { 
            positionId, 
            liquidityPool 
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
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
                        kind: ErrorSuiObjectKind.PositionNFT,
                        id: positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                // Stage: on-chain fetch validation (object must be a Move object)
                if (positionNftObjectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        kind: ErrorSuiObjectKind.PositionNFT,
                        id: positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                const positionNftFields = positionNftObjectInfo.data.content.fields as unknown as TurbosSuiObjectPositionNFTFields
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
                        kind: ErrorSuiObjectKind.Position,
                        id: turbosPositionNFT.positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                // Stage: on-chain fetch validation (object must be a Move object)
                if (clmmPosition.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        kind: ErrorSuiObjectKind.PositionNFT,
                        id: turbosPositionNFT.positionId,
                        dexId: DexId.Turbos,
                        liquidityPoolId: liquidityPool.displayId,
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
            liquidityPool,
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
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        // Stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }   
        const targetIsA = bot.targetToken.toString() === tokenA.id
        const { 
            tickLower, 
            tickUpper,
            utilizationPercentage,
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: new Decimal(liquidityPool.clmmState.tickMultiplier),
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
            liquidityPool,
            tickUpper,
        })
        if (bot.version === AppVersion.V1) {
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock: openPositionTxb,
                        sender: bot.accountAddress,
                    })
                },
            })
            
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionSubmitFailedException({
                    originalError: new TransactionValidationFailedException({
                        botId: bot.id,
                        txHash: devInspect.effects.transactionDigest,
                        liquidityPoolId: liquidityPool.displayId,
                        type: TransactionType.OpenPosition,
                    }),
                    message: devInspect.effects.status.error ?? "Unknown error",
                })
            }
            
            const bytes = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await openPositionTxb.build({
                        client: suiClient,
                    })
                },
            })
            
            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
            
            const signatureWithBytes = await this.signerService.withSuiSigner({
                bot,
                action: async (signer) => {
                    return await signer.signTransaction(bytes)
                },
            })
            
            return {
                prepareTxs: [
                    {
                        txHash,
                        signatureWithBytes,
                    },
                ],
                feeAmountA,
                feeAmountB,
                tickLower,
                tickUpper,
            }
        } else {
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
            
            const { txHash, signatureWithBytes } = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await this.privySignService.signSuiTransaction({
                        publicKeyHex: privyMetadata.walletPublicKey!,
                        client: suiClient,
                        walletId: privyMetadata.walletId!,
                        transaction: openPositionTxb,
                        encryptedPrivySignerPrivateKey: encryptedPrivySignerPrivateKey,
                    })
                },
            })
            
            return {
                prepareTxs: [
                    {
                        txHash,
                        signatureWithBytes,
                    },
                ],
                feeAmountA,
                feeAmountB,
                tickLower,
                tickUpper,
            }
        }
    }

    async execute(
        {
            bot,
            state,
            txCheck,
            stimulate,
            prepareTxs,
            liquidityPool,
        }: ExecuteOpenPositionParams
    ): Promise<ExecuteOpenPositionResult> {
        // Sui requires exactly one transaction per execution
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.OpenPosition,
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
                                showEvents: true,
                            }
                        })
                    },
                })
            )
            if (txBlock !== null && txBlock.effects?.status?.status === "success") {
                const { positionId } = this.parseMintEvents({
                    bot,
                    liquidityPool,
                    txHash,
                    state: _state,
                    events: txBlock?.events || [],
                })
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionFound,
                    {
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: liquidityPool.displayId,
                    }
                )
                return {
                    positionId,
                    txHashes: [txHash],
                }
            }
        }
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: liquidityPool.displayId,
                type: TransactionType.OpenPosition,
            })
        }
        if (stimulate) {
            const transactionBlock = Transaction.from(signatureWithBytes.bytes)
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                },
            })
            
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: devInspect.effects.transactionDigest,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                })
            }
            
            this.winstonService.log(
                WinstonLog.OpenPositionTransactionStimulated,
                {
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            
            const { positionId } = this.parseMintEvents({
                bot,
                liquidityPool,
                txHash,
                state: _state,
                events: devInspect.events || [],
            })
            
            return {
                positionId,
                txHashes: [txHash],
            }
        }
        
        const { digest, events, effects } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                        showEffects: true,
                    }
                })
            },
        })
        
        if (effects?.status?.status !== "success") {
            throw new TransactionSubmitFailedException({
                originalError: new TransactionExecutionFailedException({
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                }),
                message: effects?.status?.error ?? "Unknown error",
            })
        }
        
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })
        
        this.winstonService.log(
            WinstonLog.OpenPositionTransactionExecuted,
            {
                botId: bot.id,
                txHash: digest,
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        
        const { positionId } = this.parseMintEvents({
            bot,
            liquidityPool,
            txHash,
            state: _state,
            events: events || [],
        })
        return {
            positionId,
            txHashes: [txHash],
        }
    }

    private parseMintEvents(
        {
            bot,
            txHash,
            liquidityPool,
            events,
        }: ParseMintEventsParams
    ): ParseMintEventsResult {
        const eventType = "::position_manager::MintNftEvent"
        const mintNftEvent = events.find(
            event => event.type.includes(eventType)
        )
        if (!mintNftEvent) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: liquidityPool.displayId,
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
    liquidityPool: LiquidityPoolSchema
    events: Array<SuiEvent>
}