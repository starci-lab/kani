import {
    Injectable
} from "@nestjs/common"
import {
    IOpenActionService,
    PrepareOpenPositionParams,
    PrepareOpenPositionResult,
    ExecuteOpenPositionParams,
    ExecuteOpenPositionResult,
    ConfirmOpenPositionResult,
    ConfirmOpenPositionParams,
    SignOpenPositionParams,
    SignOpenPositionResult,
} from "../types"
import {
    DlmmLiquidityPoolState,
} from "../../types"
import {
    DexId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    BalanceSnapshotsNotFoundException,
    InvalidPoolTokensException, MissingPositionIdParamException, TransactionType 
} from "@modules/exceptions"
import BN from "bn.js"
import {
    OpenPositionInstructionService
} from "./transactions"
import {
    SolanaTxService,
    SolanaStimulateService,
    SolanaExecuteService,
    SolanaFetchService,
    AccountKind,
} from "../../clients"
import {
    ChainId
} from "@modules/common"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import bs58 from "bs58"

/**
 * Service responsible for opening positions on Meteora DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * Execution stages (DEX action convention):
 * - confirm -> prepare -> sign -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying RPC services
 *
 * @example
 * const service = new MeteoraOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class MeteoraOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaTxService: SolanaTxService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
        private readonly solanaFetchService: SolanaFetchService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }

    /**
     * Confirms an open position by fetching position account from chain.
     *
     * Stage: on-chain fetch
     * - Fetch position account and validate it exists
     *
     * @param param - Parameters for confirming open position
     * @param param.positionId - Position account address
     * @param param.liquidityPool - Liquidity pool
     * @returns Confirmation result (currently empty)
     */
    async confirm({
        positionId,
        liquidityPool,
    }: ConfirmOpenPositionParams): Promise<ConfirmOpenPositionResult> {
        await this.solanaFetchService.fetchAccount({
            address: positionId,
            kind: AccountKind.PersonalPosition, 
            dexId: DexId.Meteora,
            liquidityPoolId: liquidityPool.displayId,
        })
        return {
            // Temporary empty, will need other logic to get liquidity
        }
    }

    /**
     * Prepares an open position transaction.
     *
     * Stage: state validation
     * - Requires balance snapshots
     * - Requires pool token metadata
     *
     * Stage: transaction building
     * - Calculate amounts based on target token
     * - Create open position instructions
     * - Build unsigned transaction with latest blockhash
     * - Serialize transaction and position keypair private key
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - DLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool
     * @returns Prepared unsigned transaction (serializedTx only) with position details
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     */
    async prepare(
        {
            state,
            liquidityPool,
            bot,
        }: PrepareOpenPositionParams): Promise<PrepareOpenPositionResult> {
        const _state = state as DlmmLiquidityPoolState
        const targetIsA = bot.targetToken.toString() === liquidityPool.tokenA.toString()
        // stage: state validation (requires balance snapshots for sizing)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        // stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenA.toString(),
            }, 
        }) 
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: liquidityPool.tokenB.toString(),
            },
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // stage: transaction building (extract balance amounts)
        const {
            targetBalanceAmount: snapshotTargetBalanceAmount,
            quoteBalanceAmount: snapshotQuoteBalanceAmount
        } = bot.balanceSnapshots
        const snapshotTargetBalanceAmountBN = new BN(snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(snapshotQuoteBalanceAmount)
        // stage: transaction building (calculate amounts based on target token)
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN
        // stage: transaction building (create open position instructions)
        const {
            instructions: openPositionInstructions,
            positionKeyPair,
            minBinId,
            maxBinId,
            feeAmountA,
            feeAmountB,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            amountA,
            amountB,
            liquidityPool,
        })
        // return result
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(openPositionInstructions),
                    privateKeys: [
                        bs58.encode(positionKeyPair.secretKey),
                    ],
                }
            ],
            feeAmountA,
            feeAmountB,
            amountA,
            amountB,
            minBinId,
            maxBinId,
            positionId: positionKeyPair.publicKey.toString(),
        }
    }

    /**
     * Signs an open position transaction.
     *
     * Stage: deserialization
     * - Deserialize PrepareTx to get unsigned transaction and position keypair private key
     * - Recreate position keypair from private key
     *
     * Stage: signing
     * - Sign with V1 signer + position keypair or Privy (V2) + position keypair
     *
     * Stage: validation
     * - Validate transaction is sendable and within size limit
     *
     * @param param - Parameters for signing open position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared unsigned transaction
     * @returns Signed transaction
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async sign({
        bot,
        prepareTx,
        liquidityPool,
    }: SignOpenPositionParams): Promise<SignOpenPositionResult> {
        // stage: sign transaction
        return {
            signedTx: await this.solanaTxService.signTx(
                {
                    bot,
                    prepareTx,
                    transactionType: TransactionType.OpenPosition,
                    liquidityPool,
                }
            )
        }
    }

    /**
     * Executes an open position transaction.
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
     * @param param - Parameters for executing open position
     * @param param.bot - Bot schema
     * @param param.txCheck - Whether to check if transaction already exists
     * @param param.positionId - Position ID to confirm
     * @param param.stimulate - Whether to simulate transaction execution
     * @param param.signedTx - Signed transaction
     * @param param.liquidityPool - Liquidity pool
     * @returns Execution result with position ID and transaction hashes
     * @throws {MissingPositionIdParamException} If position ID is missing
     */
    async execute({
        bot,
        txCheck,
        positionId,
        stimulate,
        signedTx,
        liquidityPool,
    }: ExecuteOpenPositionParams): Promise<ExecuteOpenPositionResult> {
        // stage: input validation (position ID must be provided)
        if (!positionId) {
            throw new MissingPositionIdParamException({
                botId: bot.id,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // stage: idempotency check (optional)
        if (txCheck && !stimulate) {
            const transaction = await this.solanaFetchService.fetchTransaction({
                txHash: signedTx.txHash,
            })
            if (transaction) {
                return {
                    positionId,
                    txHash: signedTx.txHash,
                }
            }
        }
        // stage: simulation (optional)
        if (stimulate) {
            await this.solanaStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.OpenPosition,
                liquidityPoolId: liquidityPool.displayId,
            })
            return {
                positionId,
                txHash: signedTx.txHash,
            }
        }
        // stage: execution
        const { txHash } = await this.solanaExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.OpenPosition,
            liquidityPoolId: liquidityPool.displayId,
        })
        return {
            positionId,
            txHash,
        }
    }
}
