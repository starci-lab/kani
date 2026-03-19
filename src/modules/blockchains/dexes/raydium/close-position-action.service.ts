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
}from "../types"
import {
    ClmmLiquidityPoolState,
} from "../../types"
import { 
    PrimaryMemoryStorageService,
    TransactionType,
} from "@modules/databases"
import { 
    ClosePositionInstructionService, 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
}from "@modules/exceptions"
import {
    SolanaFetchService,
    SolanaStimulateService,
    SolanaExecuteService,
    SolanaTxService,
}from "../../clients"
import {
    ChainId
}from "@modules/common"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"

/**
 * Service responsible for closing positions on Raydium DEX.
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
 * const service = new RaydiumClosePositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class RaydiumClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
        private readonly solanaTxService: SolanaTxService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * Prepares a close position transaction.
     * Validates state, builds transaction, and signs it.
     *
     * Stage: state validation
     * - Requires active position
     * - Requires pool token metadata
     *
     * Stage: transaction building
     * - Create close position instructions
     * - Build and sign transaction
     *
     * @param param - Parameters for preparing close position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @returns Prepared transaction with signature
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {InvalidPoolTokensException}If pool token metadata is missing
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        { bot, liquidityPool, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResult> {
        const _state = state as ClmmLiquidityPoolState

        // stage: state validation (close requires an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }

        // stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // stage: transaction building (create close position instructions)
        const instructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state: _state,
            liquidityPool,
        })

        return {
            prepareTxs: [
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(instructions),
                }
            ],
        }
    }

    /**
     * Signs a close position transaction.
     * Validates state, builds transaction, and signs it.
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
            signedTx: await this.solanaTxService.signTx({
                bot,
                prepareTx,
                transactionType: TransactionType.ClosePosition,
                liquidityPool,
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
     * @param param.state - CLMM liquidity pool state
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.prepareTxs - Array of prepared transactions
     * @param param.stimulate - Whether to simulate transaction execution
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
            const transaction = await this.solanaFetchService.fetchTransaction({
                txHash: signedTx.txHash,
            })
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
