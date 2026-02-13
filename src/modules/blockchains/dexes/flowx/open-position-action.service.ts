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
} from "../types"
import {
    ClmmLiquidityPoolState 
} from "../../types"
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
    SlippageToleranceExceededException,
    SuiSingleTransactionRequiredException,
    MissingSuiMessageWithBytesParamException,
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

/**
 * Service responsible for opening positions on FlowX DEX.
 * Mirrors CetusOpenPositionActionService structure & conventions.
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
    ) {}

    /**
     * Confirms an open position by fetching and validating position data.
     */
    async confirm(
        { positionId, liquidityPool }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        const { liquidity } = await this.suiFetchService.fetchObject<FlowXClmmPosition>({
            objectId: positionId,
            kind: SuiObjectKind.Position,
            dexId: DexId.FlowX,
            liquidityPool,
        })

        return {
            liquidity: new BN(liquidity),
        }
    }

    /**
     * Parses increase liquidity event from transaction events (FlowX specific).
     */
    private parseIncreaseLiquidityEvent(
        {
            bot,
            txHash,
            events,
            liquidityPool,
        }: ParseIncreaseLiquidityEventParams
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
     * Prepares an open position transaction.
     * Calculates tick range, validates slippage, builds tx, and signs it.
     */
    async prepare(
        {
            bot,
            state,
            liquidityPool,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
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
                $eq: liquidityPool.tokenA.toString() 
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenB.toString() 
            },
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

        // validate slippage tolerance (same rule as Cetus)
        const slippage = new Decimal(envConfig().dexes.flowx.openPosition.slippage)
        if (utilizationPercentage.lt(new Decimal(1).sub(slippage))) {
            throw new SlippageToleranceExceededException({
                slippage: slippage.toNumber(),
            })
        }

        // calculate max amounts for each token
        const amountAMax = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const amountBMax = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount

        // create open position transaction builder
        const {
            txb: openPositionTxb,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionTxbService.createOpenPositionTxb({
            bot,
            amountA: new BN(amountAMax),
            amountB: new BN(amountBMax),
            liquidity: new BN(0),
            tickLower,
            state: _state,
            liquidityPool,
            tickUpper,
        })

        // sign transaction
        const signedTx = await this.suiTxService.signTx({
            bot,
            tx: openPositionTxb,
        })

        return {
            signedTxs: [signedTx],
            feeAmountA,
            feeAmountB,
            tickLower,
            tickUpper,
        }
    }

    /**
     * Executes an open position transaction.
     * Handles tx check, stimulation, and execution.
     */
    async execute(
        {
            bot,
            txCheck,
            stimulate,
            signedTxs,
            state,
            liquidityPool,
        }: ExecuteOpenPositionParams
    ): Promise<ExecuteOpenPositionResult> {
        // Sui requires exactly 1 transaction
        if (signedTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException({
                botId: bot.id,
                type: TransactionType.OpenPosition,
                numTxs: signedTxs.length,
            })
        }

        const [signedTx] = signedTxs
        const _state = state as ClmmLiquidityPoolState

        // check if transaction already exists on-chain
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })

            // return if transaction already executed successfully
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
                    txHashes: [signedTx.txHash],
                }
            }
        }

        // must have messageWithBytes / signatureWithBytes
        if (!signedTx.signatureWithBytes) {
            throw new MissingSuiMessageWithBytesParamException({
                botId: bot.id,
                type: TransactionType.OpenPosition,
            })
        }

        // stimulate
        if (stimulate) {
            const result = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            })

            const { txHash, events } = result
            const { positionId } = this.parseIncreaseLiquidityEvent({
                state: _state,
                bot,
                txHash,
                events,
                liquidityPool,
            })

            return {
                positionId,
                txHashes: [txHash],
            }
        }

        // execute on-chain
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
            txHashes: [txHash],
        }
    }
}