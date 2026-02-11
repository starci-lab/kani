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
    ClmmLiquidityPoolState,
} from "../../types"
import {
    Transaction, TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    SignerService 
} from "../../signers"
import BN from "bn.js"
import {
    AppVersion, DexId, PrimaryMemoryStorageService,
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
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectNotFoundException,
    ErrorSuiObjectKind,
    SuiObjectInvalidTypeException,
    TransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
    TransactionSubmitFailedException,
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
    FlowXClmmPosition 
} from "./struct"
import {
    PrivySignService 
} from "@modules/privy"
import Decimal from "decimal.js"
import {
    IncreaseLiquidityEvent,
    ParseIncreaseLiquidityEventParams,
    ParseIncreaseLiquidityEventResult
} from "./types"

/**
 * Service responsible for opening positions on FlowX DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new FlowXOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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
        { positionId, liquidityPool }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
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
                            kind: ErrorSuiObjectKind.Position,
                            id: positionId,
                            dexId: DexId.FlowX,
                            liquidityPoolId: liquidityPool.displayId,
                        }
                    )
                }
                // Stage: on-chain fetch validation (object must be a Move object)
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException(
                        {
                            kind: ErrorSuiObjectKind.Position,
                            id: positionId,
                            dexId: DexId.FlowX,
                            liquidityPoolId: liquidityPool.displayId,
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
            liquidityPool,
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
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const targetIsA = bot.targetToken.toString() === liquidityPool.tokenA.toString()
        const { tickLower, tickUpper } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: new Decimal(liquidityPool.clmmState.tickMultiplier),
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
            liquidityPool,
            tickUpper,
        })
        if (bot.version === AppVersion.V1) {
            // dev inspect the transaction block
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
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: devInspect.effects.transactionDigest,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                })
            }
            
            // build transaction
            const bytes = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await openPositionTxb.build({
                        client: suiClient,
                    })
                },
            })
            
            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
            
            // sign transaction
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

    async execute({
        bot,
        state,
        txCheck,
        stimulate,
        prepareTxs,
        liquidityPool,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
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
                const { positionId } = this.parseIncreaseLiquidityEvent({
                    state: _state,
                    bot,
                    liquidityPool,
                    txHash,
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
                throw new TransactionSubmitFailedException({
                    originalError: new TransactionStimulatedFailedException({
                        botId: bot.id,
                        txHash: devInspect.effects.transactionDigest,
                        liquidityPoolId: liquidityPool.displayId,
                        type: TransactionType.OpenPosition,
                    }),
                    message: devInspect.effects.status.error ?? "Unknown error",
                }
                )
            }
            
            const { positionId } = this.parseIncreaseLiquidityEvent({
                state: _state,
                bot,
                liquidityPool,
                txHash,
                events: devInspect.events || [],
            })
            
            this.winstonService.log(
                WinstonLog.OpenPositionTransactionStimulated,
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
        
        const { digest, events, effects } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                        showEffects: true,
                    },
                })
            },
        })
        
        if (effects?.status?.status !== "success") {
            throw new TransactionSubmitFailedException({
                originalError: new TransactionExecutionFailedException({
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
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
        
        const { positionId } = this.parseIncreaseLiquidityEvent({
            state: _state,
            bot,
            liquidityPool,
            txHash,
            events: events || [],
        })
        return {
            positionId,
            txHashes: [txHash],
        }
    }

    private parseIncreaseLiquidityEvent(
        {
            bot,
            txHash,
            events,
            liquidityPool,
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
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const parsed = event.parsedJson as IncreaseLiquidityEvent
        return {
            positionId: parsed.position_id,
        }
    }
}
