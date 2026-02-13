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
    BN 
} from "bn.js"
import { 
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
    TransactionType,
    LiquidityPoolClmmStateNotFoundException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    SuiExecuteService,
    SuiFetchService,
    SuiStimulateService,
    SuiObjectKind
} from "../../clients"
import {
    SuiEvent 
} from "@mysten/sui/client"
import {
    MintNftEvent, 
    parseTurbosSuiObjectPositionNFT, 
    TurbosSuiObjectPosition, 
    TurbosSuiObjectPositionNFT, 
    parseTurbosPosition
} from "./struct"
import {
    ChainId 
} from "@modules/common"
        
@Injectable()
export class TurbosOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionTxbService: OpenPositionTxbService,
        private readonly tickMathService: TickMathService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiExecuteService: SuiExecuteService,
    ) {}
    
    /**
     * Confirms an open position by fetching position NFT and position.
     *
     * @param param - Parameters for confirming open position
     * @param param.positionId - Position NFT ID
     * @param param.liquidityPool - Liquidity pool
     * @returns Confirmation result with position liquidity
     */
    async confirm(
        { 
            positionId, 
            liquidityPool 
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        // Stage: on-chain fetch (position NFT must exist)
        const positionNftRaw = await this.suiFetchService.fetchObject<TurbosSuiObjectPositionNFT>(
            {
                objectId: positionId,
                kind: SuiObjectKind.PositionNFT,
                dexId: DexId.Turbos,
                liquidityPool,
            }
        )
        const positionNft = parseTurbosSuiObjectPositionNFT(positionNftRaw.fields)
        // Stage: on-chain fetch (position must exist)
        const positionRaw = await this.suiFetchService.fetchObject<TurbosSuiObjectPosition>(
            {
                objectId: positionNft.positionId,
                kind: SuiObjectKind.Position,
                dexId: DexId.Turbos,
                liquidityPool,
            }
        )
        const position = parseTurbosPosition(positionRaw.fields)
        // Stage: return position liquidity
        return {
            liquidity: new BN(position.liquidity),
        }
    }
    /**
     * Validates state, calculates amounts, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared transaction with position details
     */
    async prepare(
        {
            bot,
            state,
            liquidityPool,
        }: PrepareOpenPositionParams
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
            bot,
            liquidityPool,
            tickLower,
            tickUpper,
            liquidity: new BN(0),
            state: _state,
            amountAMax: amountA,
            amountBMax: amountB,
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
     * @param param.txHash - Transaction hash
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.stimulate - Whether to simulate transaction execution
     * @param param.signedTx - Signed transaction
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with position ID and transaction hashes
     */
    async execute(
        {
            bot,
            state,
            txCheck,
            stimulate,
            signedTx,
            liquidityPool,
        }: ExecuteOpenPositionParams
    ): Promise<ExecuteOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: idempotency check (optional)
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })

            if (txBlock) {
                const { positionId } = this.parseMintEvents({
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

            const { positionId } = this.parseMintEvents({
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

        const { positionId } = this.parseMintEvents({
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
     * Parses the MintNftEvent from the transaction events.
     *
     * @param param - Parameters for parsing mint events
     * @param param.bot - Bot schema
     * @param param.txHash - Transaction hash
     * @param param.liquidityPool - Liquidity pool
     * @param param.events - Transaction events
     * @returns Parsed mint event with position ID
     */
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

/**
 * Result of parsing mint events.
 * @param positionId - Position ID
 */
interface ParseMintEventsResult {
    positionId: string
}

/**
 * Parameters for parsing mint events.
 * @param bot - Bot schema
 * @param txHash - Transaction hash
 * @param state - CLMM liquidity pool state
 * @param liquidityPool - Liquidity pool
 * @param events - Transaction events
 */
interface ParseMintEventsParams {
    bot: BotSchema
    txHash: string
    state: ClmmLiquidityPoolState
    liquidityPool: LiquidityPoolSchema
    events: Array<SuiEvent>
}