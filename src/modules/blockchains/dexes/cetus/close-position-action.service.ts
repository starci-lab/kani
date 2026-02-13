import {
    Injectable 
} from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    PrepareClosePositionParams,
    PrepareClosePositionResult,
    ExecuteClosePositionResult,
} from "../types"
import { 
    ClosePositionTxbService, 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    TransactionNotPreparedException,
    TransactionType,
    SuiSingleTransactionRequiredException,
} from "@modules/exceptions"
import {
    SuiTxService,
    SuiStimulateService,
    SuiExecuteService,
} from "../../clients"
import {
    SuiFetchService 
} from "../../clients"
import {
    ClmmLiquidityPoolState,
} from "../../types"

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
        private readonly suiTxService: SuiTxService,
        private readonly suiStimulateService: SuiStimulateService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiExecuteService: SuiExecuteService,
    ) {}

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
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        // create close position transaction builder
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
            liquidityPool,
        })
        // sign transaction
        const signedTx = await this.suiTxService.signTx(
            {
                bot,
                tx: closePositionTxb,
            }
        )   
        return {
            signedTxs: [signedTx],
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
            signedTxs, 
            stimulate, 
            liquidityPool 
        }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Sui requires exactly 1 transaction
        if (signedTxs.length !== 1) {
            throw new SuiSingleTransactionRequiredException(
                {
                    botId: bot.id,
                    type: TransactionType.ClosePosition,
                    numTxs: signedTxs.length,
                }
            )
        }
        // extract transaction details
        const [signedTx] = signedTxs
        // check if transaction already exists on-chain
        if (txCheck && !stimulate) {
            const txBlock = await this.suiFetchService.fetchTransactionBlock(
                {
                    txHash: signedTx.txHash,
                }
            )
            if (txBlock) {
                return {
                    txHashes: [signedTx.txHash],
                }
            }
        }
        
        // validate signature exists
        if (!signedTx.signatureWithBytes) {
            throw new TransactionNotPreparedException({
                botId: bot.id,
                txHash: signedTx.txHash,
                liquidityPoolId: liquidityPool.displayId,
                type: TransactionType.ClosePosition,
            })
        }
        
        if (stimulate) {
            const result = await this.suiStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
            })
            const { txHash } = result
            return {
                txHashes: [txHash],
            }
        }
        
        // execute transaction on-chain
        const { txHash } = await this.suiExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.ClosePosition,
            liquidityPool,
        })
        
        return {
            txHashes: [txHash],
        }
    }
}
