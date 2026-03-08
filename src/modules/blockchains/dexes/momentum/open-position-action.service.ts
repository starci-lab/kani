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
    SignOpenPositionParams,
    SignOpenPositionResult,
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
    RangeTierNotConfiguredException,
} from "@modules/exceptions"
import {
    SuiExecuteService,
    SuiFetchService, 
    SuiObjectKind,
    SuiStimulateService,
    SuiTxService,
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
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service responsible for opening positions on Momentum DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * Execution stages (DEX action convention):
 * - confirm -> prepare -> sign -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying Sui services
 * - Event parsing failures throw explicitly (required event missing)
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
        private readonly suiTxService: SuiTxService,
        private readonly mountStorageService: MountStorageService,
    ) {}
    
    /**
     * Confirms an open position by fetching position account from chain.
     *
     * Stage: on-chain fetch
     * - Fetch position object and return its liquidity
     *
     * @param param - Parameters for confirming open position
     * @param param.positionId - Position account address
     * @param param.liquidityPool - Liquidity pool
     * @returns Confirmation result with position liquidity
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
     *
     * Stage: state validation
     * - Requires balance snapshots
     * - Requires CLMM state
     * - Requires pool token metadata
     *
     * Stage: transaction building
     * - Calculate optimal tick range
     * - Build unsigned transaction
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared unsigned transaction (serializedTx only)
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
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
        // stage: state validation (requires balance snapshots for sizing)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        // stage: state validation (pool must have CLMM static state)
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // get range tier
        const tier = this.mountStorageService.appConfig.rangeTiers.find((tier) => tier.tier === bot.rangeTier)
        if (!tier) {
            throw new RangeTierNotConfiguredException({
                rangeTier: bot.rangeTier,
            })
        }
        // calculate tick multiplier based on range tier and tick spacing
        const tickMultiplier = new Decimal(tier.ticks).div(new Decimal(liquidityPool.clmmState.tickSpacing)).ceil()
        // stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // stage: transaction building (extract balance amounts)
        const {
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount
        } = bot.balanceSnapshots
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)
        // stage: transaction building (determine if target token is token A)
        const targetIsA = bot.targetToken.toString() === tokenA.id
        // stage: transaction building (find optimal tick range)
        const {
            tickLower,
            tickUpper
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier,
            targetBalanceAmount: snapshotTargetBalanceAmountBN,
            quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
            targetIsA,
        })
        // stage: transaction building (calculate amounts based on target token)
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN
        // stage: transaction building (build unsigned transaction)
        const { txb: openPositionTxb } = await this.openPositionTxbService.createOpenPositionTxb({
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
            tickLower,
            tickUpper,
            amountA,
            amountB,
        }
    }

    /**
     * Signs an open position transaction.
     *
     * Stage: signing
     * - Sign with V1 signer or Privy (V2)
     *
     * @param param - Parameters for signing open position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared unsigned transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
        liquidityPool,
    }: SignOpenPositionParams): Promise<SignOpenPositionResult> {
        return {
            signedTx: await this.suiTxService.signTx({
                bot,
                prepareTx,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            }),
        }
    }

    /**
     * Executes an open position transaction.
     *
     * Stage: idempotency check (optional)
     * - If txCheck is enabled and not stimulating, attempt to fetch transaction
     * - If found, parse position ID and return immediately
     *
     * Stage: simulation (optional)
     * - If stimulate is enabled, simulate transaction execution
     * - Parse position ID from events
     *
     * Stage: execution
     * - Execute transaction on-chain
     * - Parse position ID from events
     *
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.stimulate - Whether to simulate transaction execution
     * @param param.signedTx - Signed transaction
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with position ID and transaction hashes
     * @throws {TransactionEventNotFoundException} If AddLiquidity event is not found in transaction
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
        // stage: idempotency check (optional)
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
        // stage: simulation (optional)
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
        // stage: execution
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
     * Stage: event parsing
     * - Locate AddLiquidity event in events array
     * - Extract position ID from event
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
        const event = events?.find(
            event => event.type.includes(eventType)
        )
        if (!event) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const parsed = event.parsedJson as AddLiquidityEvent
        return {
            positionId: parsed.position_id,
        }
    }
}