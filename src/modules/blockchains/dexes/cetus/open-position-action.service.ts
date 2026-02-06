import {
    Injectable 
} from "@nestjs/common"
import {
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    ExecuteOpenPositionResult,
    IOpenActionService,
    ClmmLiquidityPoolState,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
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
    TransactionValidationFailedException,
    TransactionStimulatedFailedException,
    TransactionExecutionFailedException,
    PrivyPublicKeyNotFoundException,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
    ErrorTransactionType,
    EncryptedPrivySignerPrivateKeyNotFoundException,
    LiquidityPoolClmmStateNotFoundException,
    SlippageToleranceExceededException,
    SuiSingleTransactionRequiredException,
    ErrorSuiSingleTransactionRequiredOperation,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    ExecuteOpenPositionParams 
} from "../../interfaces"
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
    async confirm({ positionId, state }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        
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
                        name: ErrorSuiObjectName.Position,
                        id: positionId,
                        dexId: DexId.Cetus,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                
                // validate object is a Move object
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        name: ErrorSuiObjectName.Position,
                        id: positionId,
                        dexId: DexId.Cetus,
                        liquidityPoolId: _state.static.displayId,
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
     * @param param.bot - Bot schema
     * @param param.txHash - Transaction hash
     * @param param.events - Array of Sui events
     * @returns Parsed event result with position ID
     */
    private parseAddLiquidityEvent({ state, bot, txHash, events }: ParseAddLiquidityEventParams): ParseAddLiquidityEventResult {
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
                liquidityPoolId: state.static.displayId,
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
     * @returns Prepared transaction with signature and fee amounts
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare({ bot, state }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        
        // validate balance snapshots exist
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        
        // validate CLMM state exists
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // extract balance amounts
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)
        
        // fetch pool token metadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            }
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            }
        })
        
        // validate tokens exist
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        // determine if target token is token A
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        
        // find optimal tick range
        const { tickLower, tickUpper, utilizationPercentage } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.dynamic.tickCurrent,
            tickSpacing: new Decimal(_state.static.clmmState.tickSpacing),
            tickMultiplier: new Decimal(_state.static.clmmState.tickMultiplier),
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
            tickUpper,
        })
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            // dev inspect transaction for validation
                            const devInspect = await suiClient.devInspectTransactionBlock({
                                transactionBlock: openPositionTxb,
                                sender: bot.accountAddress,
                            })
                            
                            // validate transaction effects
                            if (devInspect.effects.status.status !== "success") {
                                throw new TransactionValidationFailedException({
                                    type: ErrorTransactionType.OpenPosition,
                                    botId: bot.id,
                                    txHash: devInspect.effects.transactionDigest,
                                    liquidityPoolId: _state.static.displayId,
                                })
                            }
                            
                            // build and sign transaction
                            const bytes = await openPositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            
                            return {
                                prepareTxs: [{
                                    txHash,
                                    signatureWithBytes,
                                }],
                                feeAmountA,
                                feeAmountB,
                                tickLower,
                                tickUpper,
                            }
                        },
                    })
                } else {
                    // validate privy signing prerequisites
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
                    
                    // sign transaction with Privy
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: openPositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    
                    return {
                        prepareTxs: [{
                            txHash,
                            signatureWithBytes,
                        }],
                        feeAmountA,
                        feeAmountB,
                        tickLower,
                        tickUpper,
                    }
                }
            },
        })
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
    async execute({ bot, state, txCheck, stimulate, prepareTxs }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
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
                    txHashes: [txHash],
                }
            }
        }
        
        // validate signature exists
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                type: ErrorTransactionType.OpenPosition,
                botId: bot.id,
                txHash,
                liquidityPoolId: _state.static.displayId,
            })
        }
        
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (stimulate) {
                    // simulate transaction execution
                    const transactionBlock = Transaction.from(signatureWithBytes.bytes)
                    const devInspect = await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                    
                    // validate simulation results
                    if (devInspect.effects.status.status !== "success") {
                        throw new TransactionStimulatedFailedException({
                            botId: bot.id,
                            txHash: devInspect.effects.transactionDigest,
                            liquidityPoolId: _state.static.displayId,
                            type: ErrorTransactionType.OpenPosition,
                        })
                    }
                    
                    // parse position ID from events
                    const { positionId } = this.parseAddLiquidityEvent({
                        state: _state,
                        bot,
                        txHash,
                        events: devInspect.events || [],
                    })
                    
                    // log successful simulation
                    this.winstonService.log(
                        WinstonLog.OpenPositionTransactionStimulated,
                        {
                            botId: bot.id,
                            txHash,
                            liquidityPoolId: _state.static.displayId,
                        }
                    )
                    return {
                        positionId: positionId.toString(),
                        txHashes: [txHash],
                    }
                }
                
                // execute transaction on-chain
                const { digest, events, effects } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature,
                    options: {
                        showEvents: true,
                        showEffects: true,
                    }
                })
                
                // validate execution results
                if (effects?.status?.status !== "success") {
                    throw new TransactionExecutionFailedException({
                        botId: bot.id,
                        txHash,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                
                // wait for transaction confirmation
                await suiClient.waitForTransaction({
                    digest,
                })
                
                // log successful execution
                this.winstonService.log(
                    WinstonLog.OpenPositionTransactionExecuted,
                    {
                        botId: bot.id,
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
                
                // parse position ID from events
                const { positionId } = this.parseAddLiquidityEvent({
                    state: _state,
                    bot,
                    txHash,
                    events: events || [],
                })
                return {
                    positionId,
                    txHashes: [txHash],
                }
            },
        })
    }
}
