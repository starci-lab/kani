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
    PrepareTx,
} from "../../types"
import {
    Transaction, TransactionDataBuilder 
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
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    AsyncService 
} from "@modules/mixin"
import {
    MomentumClmmPosition 
} from "./struct"
import {
    PrivySignService 
} from "@modules/privy"
import {
    Decimal 
} from "decimal.js"
import {
    AddLiquidityEvent,
    ParseAddLiquidityEventParams,
    ParseAddLiquidityEventResult
} from "./types"

/**
 * Service responsible for opening positions on Momentum DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new MomentumOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
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
    
    /**
     * Confirms an open position by fetching position account from chain.
     *
     * @param param - Parameters for confirming open position
     * @param param.positionId - Position account address
     * @param param.state - CLMM liquidity pool state
     * @returns Confirmation result with position liquidity
     * @throws {SuiObjectNotFoundException} If position account is not found on-chain
     * @throws {SuiObjectInvalidTypeException} If fetched object is not a Move object
     */
    async confirm(
        { positionId, liquidityPool }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                // Fetch position account from chain
                const objectInfo = await suiClient.getObject({
                    id: positionId,
                    options: {
                        showContent: true,
                    }
                })

                // Stage: on-chain fetch validation (position object must exist)
                if (objectInfo.error || !objectInfo.data) {
                    throw new SuiObjectNotFoundException({
                        kind: SuiObjectKind.Position,
                        id: positionId,
                        dexId: DexId.Momentum,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                // Stage: on-chain fetch validation (object must be a Move object)
                if (objectInfo.data.content?.dataType !== "moveObject") {
                    throw new SuiObjectInvalidTypeException({
                        kind: ErrorSuiObjectKind.Position,
                        id: positionId,
                        dexId: DexId.Momentum,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                const fields = objectInfo.data.content.fields as unknown as MomentumClmmPosition
                return {
                    liquidity: new BN(fields.liquidity),
                }
            },
        })
    }

    /**
     * Prepares an open position transaction.
     * Validates state, calculates amounts, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with position details
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {TransactionStimulatedFailedException} If transaction dev inspect fails
     * @throws {PrivyPublicKeyNotFoundException} If Privy wallet public key is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        {
            bot,
            state,
            liquidityPool,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const txb = new Transaction()
        let prepareTx: PrepareTx
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (requires balance snapshots for sizing)
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

        // Extract balance amounts from snapshots
        const {
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount
        } = bot.balanceSnapshots
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)

        // Find token metadata
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

        // Determine if target token is token A
        const targetIsA = bot.targetToken.toString() === tokenA.id

        // Find optimal tick range based on balance amounts
        const {
            tickLower,
            tickUpper
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: new Decimal(liquidityPool.clmmState.tickMultiplier),
            targetBalanceAmount: snapshotTargetBalanceAmountBN,
            quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
            targetIsA,
        })

        // Calculate amounts based on target token
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN

        // Create open position transaction block
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
            liquidityPool,
        })

        if (bot.version === AppVersion.V1) {
            // Dev inspect the transaction block to validate
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock: openPositionTxb,
                        sender: bot.accountAddress,
                    })
                },
            })
            
            // Stage: transaction validation (dev inspect must succeed)
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionStimulatedFailedException({
                    botId: bot.id,
                    txHash: devInspect.effects.transactionDigest,
                    liquidityPoolId: liquidityPool.displayId,
                    type: TransactionType.OpenPosition,
                })
            }
            
            // Build transaction
            const bytes = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await openPositionTxb.build({
                        client: suiClient,
                    })
                },
            })
            
            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
            
            // Sign transaction
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
            // Stage: state validation (Privy signing prerequisites for V2 bots)
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
            
            // Sign transaction using Privy service
            const {
                txHash,
                signatureWithBytes
            } = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
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
            // stimulate transaction
            const simulateResult = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
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
            prepareTx = {
                txHash,
                signatureWithBytes,
            }
        }
        return {
            prepareTxs: [prepareTx],
            feeAmountA,
            feeAmountB,
            tickLower,
            tickUpper,
            amountA,
            amountB,
        }
    }

    /**
     * Executes an open position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with position ID and transaction hashes
     * @throws {SuiSingleTransactionRequiredException} If more than one transaction is provided for Sui
     * @throws {TransactionNotPreparedException} If the transaction signature is missing
     * @throws {TransactionEventNotFoundException} If AddLiquidity event is not found in transaction
     * @throws {TransactionStimulatedFailedException} If transaction stimulation fails
     * @throws {TransactionExecutionFailedException} If transaction execution fails
     */
    async execute({
        bot,
        state,
        txCheck,
        stimulate,
        prepareTxs,
        liquidityPool,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        // Sui requires exactly 1 transaction per execution
        if (prepareTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                operation: ErrorSuiSingleTransactionRequiredOperation.OpenPosition,
                numTxs: prepareTxs.length,
            })
        }

        // Extract transaction details
        const [prepareTx] = prepareTxs
        const {
            txHash,
            signatureWithBytes
        } = prepareTx
        const _state = state as ClmmLiquidityPoolState

        // Stage: transaction checking (if txCheck is enabled and not stimulating)
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

            // If transaction already executed successfully, parse event and return
            if (txBlock !== null && txBlock.effects?.status?.status === "success") {
                const { positionId } = this.parseAddLiquidityEvent({
                    events: txBlock?.events || [],
                    bot,
                    txHash,
                    liquidityPool,
                    state: _state,
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

        // Stage: transaction validation (signature must exist)
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash,
                liquidityPoolId: liquidityPool.displayId,
                type: TransactionType.OpenPosition,
            })
        }

        if (stimulate) {
            // Simulate transaction execution
            const transactionBlock = Transaction.from(signatureWithBytes.bytes)
            const devInspect = await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return await suiClient.devInspectTransactionBlock({
                        transactionBlock,
                        sender: bot.accountAddress,
                    })
                },
            })

            // Stage: transaction stimulation validation
            if (devInspect.effects.status.status !== "success") {
                throw new TransactionSubmitFailedException({
                    originalError: new TransactionStimulatedFailedException({
                        botId: bot.id,
                        txHash: devInspect.effects.transactionDigest,
                        liquidityPoolId: liquidityPool.displayId,
                        type: TransactionType.OpenPosition,
                    }),
                    message: devInspect.effects.status.error ?? "Unknown error",
                })
            }

            // Parse position ID from event
            const { positionId } = this.parseAddLiquidityEvent({
                state: _state,
                liquidityPool,
                bot,
                txHash,
                events: devInspect.events || [],
            })

            // Log successful simulation
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

        // Execute transaction on-chain
        const {
            digest,
            events,
            effects
        } = await this.rpcExecutorService.withSuiClient({
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

        // Stage: transaction execution validation
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

        // Wait for transaction confirmation
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await suiClient.waitForTransaction({
                    digest,
                })
            },
        })

        // Log successful execution
        this.winstonService.log(
            WinstonLog.OpenPositionTransactionExecuted,
            {
                botId: bot.id,
                txHash: digest,
                liquidityPoolId: liquidityPool.displayId,
            }
        )

        // Parse position ID from event
        const { positionId } = this.parseAddLiquidityEvent({
            events: events || [],
            bot,
            txHash,
            liquidityPool,
            state: _state,
        })
        return {
            positionId,
            txHashes: [txHash],
        }
    }

    /**
     * Parses the AddLiquidity event from transaction events to extract position ID.
     *
     * @param param - Parameters for parsing AddLiquidity event
     * @param param.events - Array of Sui events from the transaction
     * @param param.bot - Bot schema
     * @param param.txHash - Transaction hash
     * @param param.liquidityPool - Liquidity pool
     * @returns Parsed event result with position ID
     * @throws {TransactionEventNotFoundException} If AddLiquidity event is not found in the events array
     */
    private parseAddLiquidityEvent({
        events,
        bot,
        txHash,
        liquidityPool,
    }: ParseAddLiquidityEventParams): ParseAddLiquidityEventResult {
        const eventType = "::liquidity::AddLiquidityEvent"

        // Find the AddLiquidity event in the events array
        const event = events?.find(
            event => event.type.includes(eventType)
        )

        // Stage: event parsing validation (event must exist)
        if (!event) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Parse event JSON to extract position ID
        const parsed = event.parsedJson as AddLiquidityEvent
        return {
            positionId: parsed.position_id,
        }
    }
}