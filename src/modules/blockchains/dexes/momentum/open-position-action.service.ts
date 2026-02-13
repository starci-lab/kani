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
    Transaction 
} from "@mysten/sui/transactions"
import BN from "bn.js"
import { 
    DexId, PrimaryMemoryStorageService
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
    TransactionType,
    LiquidityPoolClmmStateNotFoundException,
} from "@modules/exceptions"
import {
    SuiExecuteService,
    SuiFetchService, 
    SuiObjectKind,
    SuiStimulateService
} from "../../clients"
import {
    Decimal 
} from "decimal.js"
import {
    AddLiquidityEvent,
    ParseAddLiquidityEventParams,
    ParseAddLiquidityEventResult
} from "./types"
import {
    MomentumPool 
} from "./struct"
import {
    ChainId 
} from "@modules/common"

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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiExecuteService: SuiExecuteService,
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
        const { liquidity } = await this.suiFetchService.fetchObject<MomentumPool>(
            {
                objectId: positionId,
                kind: SuiObjectKind.Position,
                dexId: DexId.Momentum,
                liquidityPool,
            }
        )
        return {
            liquidity: new BN(liquidity),
        }
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

        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await openPositionTxb.toJSON(),
                }
            ],
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
        signedTx,
        liquidityPool,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: idempotency check (optional)
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })

            if (txBlock) {
                const { positionId } = this.parseAddLiquidityEvent({
                    state: _state,
                    bot,
                    txHash: signedTx.txHash,
                    events: txBlock?.events || [],
                    liquidityPool,
                })

                return {
                    positionId,
                    txHash: signedTx.txHash,
                }
            }
        }

        // Stage: simulation (optional)
        if (stimulate) {
            const { txHash, events } = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            })

            const { positionId } = this.parseAddLiquidityEvent({
                state: _state,
                bot,
                txHash,
                events,
                liquidityPool,
            })

            return {
                positionId,
                txHash,
            }
        }

        // Stage: execution
        const { txHash, events } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.OpenPosition,
            liquidityPool,
        })

        const { positionId } = this.parseAddLiquidityEvent({
            state: _state,
            bot,
            txHash,
            events,
            liquidityPool,
        })

        return {
            positionId,
            txHash,
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