import {
    Injectable 
} from "@nestjs/common"
import {
    ConfirmOpenPositionParams,
    ConfirmOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    IOpenActionService,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    SignOpenPositionParams,
    SignOpenPositionResult,
} from "../types"
import {
    ClmmLiquidityPoolState 
} from "../../types"
import BN from "bn.js"
import {
    DexId, 
    PrimaryMemoryStorageService,
    TransactionType,
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
    LiquidityPoolClmmStateNotFoundException,
    SlippageToleranceExceededException,
    RangeTierNotConfiguredException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    SuiObjectKind,
    SuiTxService,
    SuiFetchService,
    SuiStimulateService,
    SuiExecuteService,
} from "../../clients"
import {
    envConfig 
} from "@modules/env"
import {
    FlowXClmmPosition 
} from "./struct"
import {
    IncreaseLiquidityEvent,
    ParseIncreaseLiquidityEventParams,
    ParseIncreaseLiquidityEventResult,
} from "./types"
import {
    ChainId 
} from "@modules/common"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service responsible for opening liquidity positions on FlowX DEX.
 *
 * Responsibilities:
 * - Confirm an existing position (on-chain fetch & validation)
 * - Prepare unsigned transaction(s) (tick-range calculation + sizing + validations)
 * - Sign prepared transaction(s)
 * - Execute signed transaction (idempotency check, optional simulation, on-chain execution)
 *
 * Execution stages (DEX action convention):
 * - confirm -> prepare -> sign -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying Sui services
 * - Event parsing failures throw explicitly (required event missing)
 */
@Injectable()
export class FlowXOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiTxService: SuiTxService,
        private readonly suiExecuteService: SuiExecuteService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Confirms an existing FlowX position by fetching on-chain position data.
     *
     * Stage: on-chain fetch
     * - Fetch position object and return its liquidity
     *
     * @param param - Confirmation parameters
     * @param param.positionId - On-chain position object ID
     * @param param.liquidityPool - Liquidity pool context
     *
     * @returns Confirmed liquidity for the position
     *
     * @throws If the position object cannot be fetched or parsed by SuiFetchService
     */
    async confirm(
        { 
            positionId, 
            liquidityPool 
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        // stimulate the confirm
        if (envConfig().executor.runtime.operation.openPosition.stimulate) {
            return {
                liquidity: new BN(0),
            }
        }
        // fetch the position
        const { data: position, storageRebate } = await this.suiFetchService.fetchObject<FlowXClmmPosition>({
            objectId: positionId,
            kind: SuiObjectKind.Position,
            dexId: DexId.FlowX,
            liquidityPool,
        })
        // return the position liquidity
        const rentAmount = storageRebate
        return {
            rentAmount,
            liquidity: new BN(position.liquidity),
        }
    }

    /**
     * Parses FlowX IncreaseLiquidity event from transaction events.
     *
     * Stage: event parsing
     * - Locate FlowX IncreaseLiquidity event emitted by the position manager
     * - Extract and return the created/updated position ID
     *
     * @param param - Event parsing parameters
     * @param param.bot - Bot executing the transaction
     * @param param.txHash - Transaction hash
     * @param param.events - Transaction events
     * @param param.liquidityPool - Liquidity pool context
     *
     * @returns Parsed position ID
     *
     * @throws {TransactionEventNotFoundException}
     * If the expected IncreaseLiquidity event cannot be found
     */
    private parseIncreaseLiquidityEvent(
        { bot, txHash, events, liquidityPool }: ParseIncreaseLiquidityEventParams
    ): ParseIncreaseLiquidityEventResult {
        const eventType = "::position_manager::IncreaseLiquidity"
        const event = events?.find((e) => e.type.includes(eventType))

        if (!event) {
            throw new TransactionEventNotFoundException({
                botId: bot.id,
                txHash,
                eventType,
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        const parsed = event.parsedJson as IncreaseLiquidityEvent
        return {
            positionId: parsed.position_id?.toString(),
        }
    }

    /**
     * Prepares unsigned open position transaction(s) for FlowX CLMM.
     *
     * Stage: input/state validation
     * - Requires bot.balanceSnapshots for sizing
     * - Requires liquidityPool.clmmState for tick params
     *
     * Stage: computation
     * - Compute optimal tick range using TickMathService
     * - Validate utilization against configured slippage tolerance
     *
     * Stage: tx building
     * - Build unsigned transaction data using OpenPositionTxbService
     *
     * NOTE:
     * - This stage returns serialized unsigned tx only.
     * - Signing is handled by sign().
     *
     * @param param - Preparation parameters
     * @param param.bot - Bot configuration
     * @param param.state - Current CLMM pool state
     * @param param.liquidityPool - Liquidity pool metadata
     *
     * @returns Prepared unsigned tx(s) + derived values (fees, ticks)
     *
     * @throws {BalanceSnapshotsNotFoundException}
     * @throws {LiquidityPoolClmmStateNotFoundException}
     * @throws {InvalidPoolTokensException}
     * @throws {SlippageToleranceExceededException}
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
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
        const snapshotTargetBalanceAmount = new BN(bot.balanceSnapshots.targetBalanceAmount)
        const snapshotQuoteBalanceAmount = new BN(bot.balanceSnapshots.quoteBalanceAmount)

        // Stage: metadata validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Determine if target token is token A
        const targetIsA = bot.targetToken.toString() === liquidityPool.tokenA.toString()

        // Compute optimal tick range
        // get range tier
        const tier = this.mountStorageService.appConfig.rangeTiers.tiers.find((tier) => tier.tier === bot.rangeTier)
        if (!tier) {
            throw new RangeTierNotConfiguredException({
                rangeTier: bot.rangeTier,
            })
        }
        // calculate tick multiplier based on range tier and tick spacing
        const tickMultiplier = new Decimal(tier.ticks).div(new Decimal(liquidityPool.clmmState.tickSpacing)).ceil()
        // find optimal tick range
        const { tickLower, tickUpper, utilizationPercentage } =
            await this.tickMathService.findOptimalTickRange({
                tickCurrent: _state.tickCurrent,
                tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
                tickMultiplier: tickMultiplier,
                targetBalanceAmount: snapshotTargetBalanceAmount,
                quoteBalanceAmount: snapshotQuoteBalanceAmount,
                targetIsA,
            })

        // Stage: risk validation (slippage tolerance)
        const slippage = new Decimal(envConfig().dexes.flowx.openPosition.slippage)
        if (utilizationPercentage.lt(new Decimal(1).sub(slippage))) {
            throw new SlippageToleranceExceededException({
                slippage: slippage.toNumber(),
            })
        }

        // Size max amounts
        const amountAMax = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const amountBMax = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount

        // Stage: tx building (unsigned)
        const { txb } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            amountA: amountAMax,
            amountB: amountBMax,
            liquidity: new BN(0),
            tickLower,
            state: _state,
            liquidityPool,
            tickUpper,
        })

        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await txb.toJSON(),
                },
            ],
            tickLower,
            tickUpper,
        }
    }

    /**
     * Signs a prepared FlowX open position transaction.
     *
     * Stage: signing
     * - Convert prepared tx (serialized) into a signed tx
     * - Delegates signing to SuiTxService
     *
     * @param param - Signing parameters
     * @param param.bot - Bot signer context
     * @param param.prepareTx - Prepared transaction (serialized)
     *
     * @returns Signed transaction
     *
     * @throws If signing fails in SuiTxService
     */
    async sign(
        { 
            bot, 
            prepareTx, 
            liquidityPool 
        }: SignOpenPositionParams
    ): Promise<SignOpenPositionResult> {
        const signedTx = await this.suiTxService.signTx({
            bot,
            prepareTx,
            transactionType: TransactionType.OpenPosition,
            liquidityPool,
        })

        return {
            signedTx 
        }
    }

    /**
     * Executes a signed FlowX open position transaction.
     *
     * Stage: idempotency check (optional)
     * - If txCheck is enabled and not stimulating, attempt to fetch transaction block
     * - If found, parse events and return immediately
     *
     * Stage: simulation (optional)
     * - If stimulate is enabled, dev-inspect/stimulate and parse events
     *
     * Stage: execution
     * - Execute on-chain and parse events to extract position ID
     *
     * @param param - Execution parameters
     * @param param.bot - Bot context
     * @param param.txCheck - Whether to check if the tx already exists on-chain
     * @param param.stimulate - Whether to simulate instead of executing on-chain
     * @param param.signedTx - Signed transaction to execute
     * @param param.state - Current CLMM state (for context)
     * @param param.liquidityPool - Liquidity pool context
     *
     * @returns Position ID and transaction hash
     *
     * @throws {TransactionEventNotFoundException} If expected event is missing
     * @throws Execution-related exceptions thrown by Sui services
     */
    async execute(
        { 
            bot, 
            txCheck, 
            stimulate, 
            signedTx, 
            state, 
            liquidityPool 
        }: ExecuteOpenPositionParams
    ): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: idempotency check (optional)
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })

            if (txBlock) {
                const { positionId } = this.parseIncreaseLiquidityEvent({
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

            const { positionId } = this.parseIncreaseLiquidityEvent({
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

        const { positionId } = this.parseIncreaseLiquidityEvent({
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
}