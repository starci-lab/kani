import {
    Injectable 
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
    ExecuteClosePositionResult,
    SignClosePositionParams,
    SignClosePositionResult,
} from "../types"
import {
    ClmmLiquidityPoolState,
} from "../../types"
import {
    ClosePositionTxbService 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    TransactionType,
} from "@modules/exceptions"
import {
    SuiExecuteService,
    SuiFetchService,
    SuiStimulateService,
    SuiTxService
} from "../../clients"
import {
    ChainId 
} from "@modules/common"
/**
 * Service responsible for closing positions on Momentum DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * Execution stages (DEX action convention):
 * - prepare -> sign -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying Sui services
 *
 * @example
 * const service = new MomentumClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class MomentumClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiExecuteService: SuiExecuteService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiTxService: SuiTxService,
    ) {}
    
    /**
     * Prepares a close position transaction.
     *
     * Stage: state validation
     * - Requires active position
     *
     * Stage: transaction building
     * - Build unsigned transaction
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared unsigned transaction (serializedTx only)
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // stage: state validation (close requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // stage: transaction building (build unsigned transaction)
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
            liquidityPool,
        })
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await closePositionTxb.toJSON(),
                },
            ],
        }
    }

    /**
     * Signs a close position transaction.
     *
     * Stage: signing
     * - Sign with V1 signer or Privy (V2)
     *
     * @param param - Parameters for signing close position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared unsigned transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
    }: SignClosePositionParams): Promise<SignClosePositionResult> {
        return {
            signedTx: await this.suiTxService.signTx({
                bot,
                prepareTx,
            }),
        }
    }

    /**
     * Executes a close position transaction.
     *
     * Stage: idempotency check (optional)
     * - If txCheck is enabled and not stimulating, attempt to fetch transaction
     * - If found, return immediately
     *
     * Stage: simulation (optional)
     * - If stimulate is enabled, simulate transaction execution
     *
     * Stage: execution
     * - Execute transaction on-chain
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.stimulate - Whether to simulate transaction execution
     * @param param.signedTx - Signed transaction
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with transaction hashes
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        signedTx,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // stage: idempotency check (optional)
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock({
                txHash: signedTx.txHash,
            })
            if (txBlock) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }
        // stage: simulation (optional)
        if (stimulate) {
            const { txHash } = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            })
            return {
                txHash,
            }
        }
        // stage: execution
        const { txHash } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.ClosePosition,
            liquidityPool,
        })
        return {
            txHash,
        }
    }
}
