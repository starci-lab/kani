import {
    Injectable 
} from "@nestjs/common"
import {
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    ExecuteOpenPositionResult,
    IOpenActionService,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
} from "../types"
import {
    ClmmLiquidityPoolState,
    PrepareTx,
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
    AppVersion, DexId, PrimaryMemoryStorageService
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
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectNotFoundException,
    ErrorSuiObjectKind,
    SuiObjectInvalidTypeException,
    TransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    SlippageToleranceExceededException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
    TransactionSubmitFailedException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    ExecuteOpenPositionParams 
} from "../types"
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
    envConfig 
} from "@modules/env"
import {
    AsyncService 
} from "@modules/mixin"
import {
    CetusLiquidityPosition 
} from "./struct"
import {
    PrivySignService 
} from "@modules/privy"
import {
    AddLiquidityV2Event,
    ParseAddLiquidityEventParams,
    ParseAddLiquidityEventResult
} from "./types"

/**
 * Service responsible for opening positions on Cetus DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new CetusOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class CetusOpenPositionActionService implements IOpenActionService {
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

    /**
     * Confirms an open position by fetching and validating position data.
     *
     * @param param - Parameters for confirming open position
     * @param param.positionId - Position ID to confirm
     * @param param.state - CLMM liquidity pool state
     * @returns Confirmation result with liquidity
     *
     * @example
     * const result = await service.confirm({ positionId, state })
     */
    async confirm({ positionId, liquidityPool }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                // fetch position object from on-chain
                const objectInfo = await suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    }
                })
                
                // validate position object exists
                if (objectInfo.error || !objectInfo.data) {
                    throw new SuiObjectNotFoundException({
                        kind: ErrorSuiObjectKind.Position,
                        id: positionId,
                        dexId: DexId.Cetus,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                
                // validate object is a Move object
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        kind: ErrorSuiObjectKind.Position,
                        id: positionId,
                        dexId: DexId.Cetus,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                
                // extract and return liquidity
                const fields = objectInfo.data.content.fields as unknown as CetusLiquidityPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }

    /**
     * Parses add liquidity event from transaction events.
     *
     * @param param - Parameters for parsing add liquidity event
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @param param.bot - Bot schema
     * @param param.txHash - Transaction hash
     * @param param.events - Array of Sui events
     * @returns Parsed event result with position ID
     */
    private parseAddLiquidityEvent({ liquidityPool, bot, txHash, events }: ParseAddLiquidityEventParams): ParseAddLiquidityEventResult {
        // find add liquidity event
        const eventType = "::pool::AddLiquidityV2Event"
        const event = events?.find(event =>
            event.type.includes(eventType),
        )
        
        // throw if event not found
        if (!event) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        
        // extract position ID from event
        const parsed = event.parsedJson as AddLiquidityV2Event 
        return {
            positionId: parsed.position.toString(),
        }
    }

    /**
     * Prepares an open position transaction.
     * Calculates optimal tick range, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool schema
     * @returns Prepared transaction with signature and fee amounts
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare({ bot, state, liquidityPool }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        
        // validate balance snapshots exist
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        
        // validate CLMM state exists
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        
        // extract balance amounts
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)
        
        // fetch pool token metadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenA.toString(),
            }
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenB.toString(),
            }
        })
        
        // validate tokens exist
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        
        // determine if target token is token A
        const targetIsA = bot.targetToken.toString() === liquidityPool.tokenA.toString()
        
        // find optimal tick range
        const { tickLower, tickUpper, utilizationPercentage } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: new Decimal(liquidityPool.clmmState.tickMultiplier),
            targetBalanceAmount: new BN(snapshotTargetBalanceAmount),
            quoteBalanceAmount: new BN(snapshotQuoteBalanceAmount),
            targetIsA,
        })
        // validate slippage tolerance
        const slippage = new Decimal(envConfig().dexes.cetus.openPosition.slippage)
        if (utilizationPercentage.lt(new Decimal(1).sub(slippage))) {
            throw new SlippageToleranceExceededException({
                slippage: slippage.toNumber(),
            })
        }
        
        // calculate max amounts for each token
        const amountAMax = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const amountBMax = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
        // create open position transaction builder
        const { txb: openPositionTxb, feeAmountA, feeAmountB } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            amountAMax,
            amountBMax,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            liquidityPool,
            tickUpper,
        })
        let prepareTx: PrepareTx
        if (bot.version === AppVersion.V1) {
            // dev inspect transaction for validation
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock: openPositionTxb,
                        sender: bot.accountAddress,
                    })
                },
            })
            // validate transaction effects
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionStimulatedFailedException({
                    type: TransactionType.OpenPosition,
                    botId: bot.id,
                    txHash: devInspect.effects.transactionDigest,
                    liquidityPoolId: liquidityPool.displayId,
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
            prepareTx = {
                txHash,
                signatureWithBytes,
            }
        } else {
            // validate privy signing prerequisites
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
            // sign transaction with Privy
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
            prepareTx = {
                txHash,
                signatureWithBytes,
            }
            // stimulate transaction
            const simulateResult = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Write,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock: openPositionTxb,
                        sender: bot.accountAddress,
                    })
                },
            })
            if (simulateResult.effects.status.status !== "success") {
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                })
            }
        }
        return {
            prepareTxs: [prepareTx],
            feeAmountA,
            feeAmountB,
            tickLower,
            tickUpper,
        }
    }
    
    /**
     * Executes an open position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with position ID and transaction hashes
     *
     * @example
     * const result = await service.execute({ bot, state, prepareTxs, txCheck, stimulate })
     */
    async execute({ 
        bot, 
        txCheck, 
        stimulate, 
        prepareTxs, 
        state, 
        liquidityPool 
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        // Sui requires exactly 1 transaction
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.OpenPosition,
                numTxs: prepareTxs.length,
            })
        }
        
        // extract transaction details
        const [prepareTx] = prepareTxs
        const { txHash, signatureWithBytes } = prepareTx
        const _state = state as ClmmLiquidityPoolState
        
        // check if transaction already exists on-chain
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
            // return if transaction already executed successfully
            if (txBlock !== null && txBlock.effects?.status?.status === "success") {
                const { positionId } = this.parseAddLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: txBlock?.events || [],
                    liquidityPool,
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
        
        // validate signature exists
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                type: TransactionType.OpenPosition,
                botId: bot.id,
                txHash,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        
        if (stimulate) {
            // simulate transaction execution
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
            
            // validate simulation results
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionSubmitFailedException(
                    {
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
            
            // parse position ID from events
            const { positionId } = this.parseAddLiquidityEvent({
                state: _state,
                bot,
                txHash,
                events: devInspect.events || [],
                liquidityPool,
            })
            
            // log successful simulation
            this.winstonService.log(
                WinstonLog.OpenPositionTransactionStimulated,
                {
                    botId: bot.id,
                    txHash,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return {
                positionId: positionId.toString(),
                txHashes: [txHash],
            }
        }
        
        // execute transaction on-chain
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
        
        // validate execution results
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
        
        // wait for transaction confirmation
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })
        
        // log successful execution
        this.winstonService.log(
            WinstonLog.OpenPositionTransactionExecuted,
            {
                botId: bot.id,
                txHash: digest,
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        
        // parse position ID from events
        const { positionId } = this.parseAddLiquidityEvent({
            state: _state,
            bot,
            txHash,
            events: events || [],
            liquidityPool,
        })
        return {
            positionId,
            txHashes: [txHash],
        }
    }
}
