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
    ClmmLiquidityPoolState,
} from "../../types"
import {
    SuiExecuteService, 
    SuiFetchService,
    SuiStimulateService,
    SuiTxService,
} from "../../clients"
import {
    ChainId 
} from "@modules/common"
/**
 * Service responsible for closing positions on FlowX DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * @example
 * const service = new FlowXClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class FlowXClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly suiFetchService: SuiFetchService,
        private readonly suiStimulateService: SuiStimulateService,
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
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared transaction with signature
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {TransactionValidationFailedException} If transaction dev inspect fails
     * @throws {PrivyPublicKeyNotFoundException} If Privy wallet public key is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        // Stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        const _state = state as ClmmLiquidityPoolState

        // Create the close position transaction block
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb(
            {
                bot,
                state: _state,
                liquidityPool,
            }
        )
 
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
     * @param param - Parameters for signing close position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
        liquidityPool,
    }: SignClosePositionParams): Promise<SignClosePositionResult> {
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
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with transaction hashes
     * @throws {SuiSingleTransactionRequiredException} If more than one transaction is provided for Sui
     * @throws {TransactionNotPreparedException} If the transaction signature is missing
     * @throws {TransactionStimulatedFailedException} If transaction stimulation fails
     * @throws {TransactionExecutionFailedException} If transaction execution fails
     */
    async execute({
        bot,
        txCheck,
        stimulate,
        signedTx,
        liquidityPool,
    }: ExecuteClosePositionParams): Promise<ExecuteClosePositionResult> {
        // Stage: transaction checking (if txCheck is enabled and not stimulating)
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

        if (stimulate) {
            // Simulate transaction execution
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

        // Execute transaction on-chain
        const {
            txHash,
        } = await this.suiExecuteService.execute({
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
