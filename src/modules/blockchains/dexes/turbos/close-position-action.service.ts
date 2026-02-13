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
    ClosePositionTxbService,
} from "./transactions"
import {
    ActivePositionNotFoundException,
    TransactionType,
} from "@modules/exceptions"
import {
    SuiExecuteService,
    SuiFetchService,
    SuiStimulateService,
    SuiTxService,
} from "../../clients"
import {
    ClmmLiquidityPoolState 
} from "../../types"
import {
    ChainId 
} from "@modules/common"
/**
 * Service responsible for closing positions on Turbos DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new TurbosClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class TurbosClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiExecuteService: SuiExecuteService,
        private readonly suiTxService: SuiTxService,
    ) { }

    /**
     * Signs a close position transaction.
     *
     * @param param - Parameters for signing close position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
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
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with signature
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare({
        bot,
        state,
        liquidityPool,
    }: PrepareClosePositionParams): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }  
        // create close position transaction builder
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
     * Executes a close position transaction.
     * Validates transaction, optionally checks existing transaction, and executes or simulates.
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check for existing transaction
     * @param param.stimulate - Whether to simulate transaction instead of executing
     * @param param.prepareTxs - Prepared transactions to execute
     * @returns Execution result with transaction hashes
     *
     * @example
     * const result = await service.execute({ bot, state, txCheck: true, prepareTxs })
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        signedTx,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Stage: idempotency check (optional)
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
        // Stage: simulation (optional)
        if (stimulate) {
            const { txHash } = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            })
            // Stage: return result
            return {
                txHash,
            }
        }
        // Stage: execution
        const { txHash } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.ClosePosition,
            liquidityPool,
        })
        // Stage: return result
        return {
            txHash,
        }
    }
}
