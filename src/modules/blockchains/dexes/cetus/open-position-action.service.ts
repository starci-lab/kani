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
    SignOpenPositionParams,
    SignOpenPositionResult,
} from "../types"
import {
    ClmmLiquidityPoolState,
} from "../../types"
import {
    BN,
} from "bn.js"
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
    SlippageToleranceExceededException,
    RangeTierNotConfiguredException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    ExecuteOpenPositionParams 
} from "../types"
import {
    SuiObjectKind,
    SuiFetchService,
    SuiStimulateService,
    SuiExecuteService,
    SuiTxService,
} from "../../clients"
import {
    envConfig 
} from "@modules/env"
import {
    CetusLiquidityPosition 
} from "./struct"
import {
    AddLiquidityV2Event,
    ParseAddLiquidityEventParams,
    ParseAddLiquidityEventResult
} from "./types"
import {
    ChainId 
} from "@modules/common"
import {
    MountStorageService 
} from "@modules/filesystem"

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
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiExecuteService: SuiExecuteService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiTxService: SuiTxService,
        private readonly mountStorageService: MountStorageService,
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
    async confirm(
        { positionId, liquidityPool }
        : ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        const { liquidity } = await this
            .suiFetchService
            .fetchObject<CetusLiquidityPosition>(
                {
                    objectId: positionId,
                    kind: SuiObjectKind.Position,
                    dexId: DexId.Cetus,
                    liquidityPool,
                }
            )
        return {
            liquidity: new BN(liquidity),
        }
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
     * @throws {TransactionEventNotFoundException} If add liquidity event is not found
     */
    private parseAddLiquidityEvent(
        { 
            liquidityPool, 
            bot, 
            txHash, 
            events 
        }: ParseAddLiquidityEventParams): ParseAddLiquidityEventResult {
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
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {SlippageToleranceExceededException} If slippage tolerance is exceeded
     * @throws {TransactionNotPreparedException} If transaction is not prepared
     * @throws {TransactionStimulatedFailedException} If transaction stimulation fails
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare(
        { 
            bot,
            state, 
            liquidityPool 
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        // state
        const _state = state as ClmmLiquidityPoolState
        // validate balance snapshots exist
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException(
                {   
                    botId: bot.id,
                }
            )
        }
        // validate CLMM state exists
        if (
            !liquidityPool.clmmState
        ) {
            throw new LiquidityPoolClmmStateNotFoundException(
                {
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
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
        const { 
            tickLower, 
            tickUpper, 
            utilizationPercentage 
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: tickMultiplier,
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
        const { txb: openPositionTxb } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            amountAMax,
            amountBMax,
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
                    serializedTx: await openPositionTxb.toJSON(),
                }
            ],
            tickLower,
            tickUpper,
        }
    }   

    /**
     * Signs an open position transaction.
     *
     * @param param - Parameters for signing open position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
     * @returns Signed transaction
     */
    async sign(
        {
            bot,
            prepareTx,
            liquidityPool,
        }: SignOpenPositionParams
    ): Promise<SignOpenPositionResult> {
        // sign transaction
        const signedTx = await this.suiTxService.signTx(
            {
                bot,
                prepareTx,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            }
        )
        // return signed transaction
        return {
            signedTx,
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
        // check if transaction already exists on-chain
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock(
                {
                    txHash: signedTx.txHash,
                }
            )
            // return if transaction already executed successfully
            if (txBlock) {
                const { positionId } = this.parseAddLiquidityEvent(
                    {
                        state: _state,
                        bot,
                        txHash: signedTx.txHash,
                        events: txBlock?.events || [],
                        liquidityPool,
                    }
                )
                return {
                    positionId,
                    txHash: signedTx.txHash,
                }
            }
        }
        // execute transaction on-chain
        if (stimulate) {
            const result = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            })
            const { txHash, events } = result
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
        const { txHash, events } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.OpenPosition,
            liquidityPool,
        })
        // parse position ID from events
        const { positionId } = this.parseAddLiquidityEvent(
            {
                state: _state,
                bot,
                txHash,
                events,
                liquidityPool,
            }
        )
        return {
            positionId,
            txHash,
        }
    }
}
