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
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    ClosePositionInstructionService
} from "./transactions"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    TransactionType,
} from "@modules/exceptions"
import {
    SolanaTxService,
    SolanaStimulateService,
    SolanaExecuteService,
    SolanaFetchService,
} from "../../clients"
import {
    DlmmLiquidityPoolState,
    PrepareTx
} from "../../types"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ChainId
} from "@modules/common"

/**
 * Service responsible for closing positions on Meteora DEX.
 * Handles position closure, transaction preparation, validation, and execution.
 *
 * Execution stages (DEX action convention):
 * - prepare -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying RPC services
 *
 * @example
 * const service = new MeteoraClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */ 
@Injectable()
export class MeteoraClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaTxService: SolanaTxService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly solanaFetchService: SolanaFetchService,
    ) { }

    /**
     * Prepares a close position transaction.
     *
     * Stage: state validation
     * - Requires active position
     * - Requires pool token metadata
     *
     * Stage: transaction building
     * - Create close position instructions
     * - Build unsigned transaction with latest blockhash
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - DLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared unsigned transaction (serializedTx only)
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     */
    async prepare(
        { bot, state, liquidityPool }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as DlmmLiquidityPoolState
        // stage: state validation (close requires an active position)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
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
        // stage: transaction building (create close position instructions)
        const instructions = await this.closePositionInstructionService.createCloseInstructions(
            {
                bot,
                state: _state,
                liquidityPool,
            }
        )
        // stage: transaction building (build unsigned transaction with latest blockhash)
        const { transactionMessage } = await this.solanaTxService.createTxMessage(
            {
                bot,
                instructions,
            }
        )
        const prepareTx: PrepareTx = {
            chainId: ChainId.Solana,
            serializedTx: this.superJson.stringify(transactionMessage),
        }
        return {
            prepareTxs: [prepareTx],
        }
    }

    /**
     * Signs a close position transaction.
     *
     * Stage: deserialization
     * - Deserialize PrepareTx to get unsigned transaction
     *
     * Stage: signing
     * - Sign with V1 signer or Privy (V2)
     *
     * Stage: validation
     * - Validate transaction is sendable and within size limit
     *
     * @param param - Parameters for signing close position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared unsigned transaction
     * @returns Signed transaction
     */
    async sign(
        {
            bot,
            prepareTx,
        }: SignClosePositionParams
    ): Promise<SignClosePositionResult> {
        return {
            signedTx: await this.solanaTxService.signTx(
                {
                    bot,
                    prepareTx,
                }
            ),
        }
    }
    /**
     * Executes a close position transaction.
     *
     * Stage: idempotency check (optional)
     * - If txCheck is enabled and not stimulating, attempt to fetch transaction
     * - If found, log and return immediately
     *
     * Stage: transaction validation
     * - Solana transaction must exist
     *
     * Stage: simulation (optional)
     * - If stimulate is enabled, simulate transaction execution
     *
     * Stage: execution
     * - Execute transaction on-chain
     *
     * @param param - Parameters for executing close position
     * @param param.bot - Bot schema
     * @param param.state - Dynamic CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
     * @returns Execution result with transaction hashes
     * @throws {MissingSolanaTxParamException} If the Solana transaction is missing
     * @throws {TransactionStimulatedFailedException} If transaction simulation fails
     * @throws {TransactionExecutionFailedException} If transaction execution fails
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
            const transaction = await this.solanaFetchService.fetchTransaction(
                {
                    txHash: signedTx.txHash,
                }
            )
            if (transaction) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }

        // stage: simulation (optional)
        if (stimulate) {
            await this.solanaStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.ClosePosition,
                liquidityPoolId: liquidityPool.displayId,
            })
            return {
                txHash: signedTx.txHash,
            }
        }

        // stage: execution
        const { txHash } = await this.solanaExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.ClosePosition,
            liquidityPoolId: liquidityPool.displayId,
        })
        return {
            txHash,
        }
    }
}
