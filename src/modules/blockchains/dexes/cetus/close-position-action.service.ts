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
    SuiStimulateService,
    SuiExecuteService,
    SuiTxService,
} from "../../clients"
import {
    SuiFetchService
} from "../../clients"
import {
    ClmmLiquidityPoolState,
} from "../../types"
import {
    ChainId
} from "@modules/common"

/**
 * Service responsible for closing positions on Cetus DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new CetusClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class CetusClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiExecuteService: SuiExecuteService,
        private readonly suiTxService: SuiTxService,
    ) { }

    /**
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool schema
     * @returns Prepared transaction with signature
     *
     * @example
     * const result = await service.prepare({ bot, state })
     */
    async prepare(
        {
            bot,
            state,
            liquidityPool
        }: PrepareClosePositionParams): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition) {
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
                    serializedTx: await closePositionTxb.toJSON()
                }
            ]
        }
    }

    /**
     * Signs a close position transaction.
     *
     * @param param - Parameters for signing close position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
     * @returns Signed transaction
     */
    async sign(
        {
            bot, 
            prepareTx,
            liquidityPool,
        }: SignClosePositionParams
    ): Promise<SignClosePositionResult> {
        return {
            signedTx: await this.suiTxService.signTx({
                bot,
                prepareTx,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            }),
        }
    }

    /**
     * Executes a close position transaction.
     * Handles transaction checking, stimulation, and execution.
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with transaction hashes
     *
     * @example
     * const result = await service.execute({ bot, state, prepareTxs, txCheck, stimulate })
     */
    async execute(
        {
            bot,
            txCheck,
            signedTx,
            stimulate,
            liquidityPool
        }: ExecuteClosePositionParams): Promise < ExecuteClosePositionResult > {
        // check if transaction already exists on-chain
        if(txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock(
                {
                    txHash: signedTx.txHash,
                }
            )
            if (txBlock) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }
        // Stage: simulation (optional)
        if (stimulate) {
            const result = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            })
            const { txHash } = result
            // Stage: return result
            return {
                txHash,
            }
        }
        // execute transaction on-chain
        const { txHash } = await this.suiExecuteService.execute(
            {
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            }
        )
        // Stage: return result
        return {
            txHash,
        }
    }
}
