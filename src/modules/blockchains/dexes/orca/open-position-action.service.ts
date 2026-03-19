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
    SignOpenPositionParams,
    SignOpenPositionResult,
} from "../types"
import {
    DexId, 
    OrcaPositionMetadata, 
    PrimaryMemoryStorageService,
    TransactionType,
} from "@modules/databases"
import {
    InvalidPoolTokensException,
    BalanceSnapshotsNotFoundException,
    MissingPositionIdParamException,
    LiquidityPoolClmmStateNotFoundException,
    RangeTierNotConfiguredException,
} from "@modules/exceptions"
import {
    TickMathService
} from "../../math"
import BN from "bn.js"
import {
    OpenPositionInstructionService
} from "./transactions"
import Decimal from "decimal.js"
import {
    SolanaFetchService,
    SolanaStimulateService,
    SolanaExecuteService,
    AccountKind,
    SolanaTxService,
} from "../../clients"

import {
    ClmmLiquidityPoolState,

} from "../../types"
import {
    adjustSlippage,
    ChainId,
} from "@modules/common"
import {
    envConfig
} from "@modules/env"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import bs58 from "bs58"
import {
    Position
} from "./beets"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service responsible for opening positions on Orca DEX.
 * Handles position creation, transaction preparation, validation, and execution.
 *
 * Execution stages (DEX action convention):
 * - confirm -> prepare -> execute
 *
 * Error-handling convention:
 * - Input/state validation failures throw immediately
 * - On-chain fetch failures throw immediately
 * - Simulation/execution failures propagate from underlying RPC services
 *
 * @example
 * const service = new OrcaOpenPositionActionService(...)
 * const result = await service.prepare({ bot, state })
 */
@Injectable()
export class OrcaOpenPositionActionService implements IOpenActionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
        private readonly solanaTxService: SolanaTxService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly mountStorageService: MountStorageService,
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
     * @returns Confirmation result
     */
    async confirm(
        {
            positionId,
            liquidityPool,
            metadata,
        }: ConfirmOpenPositionParams
    ): Promise<ConfirmOpenPositionResult> {
        const _metadata = metadata as OrcaPositionMetadata
        if (envConfig().executor.runtime.operation.openPosition.stimulate) {
            return {
                liquidity: new BN(0),
                rentAmount: new BN(0),
            }
        }
        const accountInfo = await this.solanaFetchService.fetchAccount({
            address: positionId,
            kind: AccountKind.PersonalPosition,
            dexId: DexId.Orca,
            liquidityPool,
        })
        const [personalPositionState] = Position.struct.deserialize(
            Buffer.from(accountInfo.data),
            8,
        )
        const liquidity = new BN(personalPositionState.liquidity.toString())
        // calculate mint account rent amount
        const mintAccountInfo = await this.solanaFetchService.fetchAccount({
            address: _metadata.nftMintAddress,
            kind: AccountKind.PositionMint,
            dexId: DexId.Orca,
            liquidityPool,
        })
        // calculate ATA account rent amount
        const ataAccountInfo = await this.solanaFetchService.fetchAccount({
            address: _metadata.ataAddress,
            kind: AccountKind.PositionMint,
            dexId: DexId.Orca,
            liquidityPool,
        })
        const rentAmount = 
            new BN(accountInfo.lamports.valueOf().toString())
                .add(new BN(mintAccountInfo.lamports.valueOf().toString()))
                .add(new BN(ataAccountInfo.lamports.valueOf().toString()))
        return {
            liquidity,
            rentAmount,
        }
    }

    /**
     * Prepares an open position transaction.
     * Validates state, calculates amounts, builds transaction, and signs it.
     *
     * Stage: state validation
     * - Requires balance snapshots
     * - Requires CLMM state
     * - Requires pool token metadata
     *
     * Stage: transaction building
     * - Calculate amounts and tick range
     * - Create open position instructions
     * - Build and sign transaction
     *
     * @param param - Parameters for preparing open position
     * @param param.bot - Bot schema
     * @param param.state - CLMM liquidity pool state
     * @param param.liquidityPool - Liquidity pool schema
     * @returns Prepared transaction with position details
     * @throws {BalanceSnapshotsNotFoundException} If balance snapshots are missing
     * @throws {LiquidityPoolClmmStateNotFoundException} If CLMM state is missing for the pool
     * @throws {InvalidPoolTokensException} If pool token metadata is missing
     * @throws {PrivyMetadataNotFoundException} If Privy metadata is not found for V2 bots
     * @throws {EncryptedPrivySignerPrivateKeyNotFoundException} If encrypted Privy signer private key is not found for V2 bots
     */
    async prepare(
        {
            state,
            bot,
            liquidityPool,
        }: PrepareOpenPositionParams
    ): Promise<PrepareOpenPositionResult> {
        const _state = state as ClmmLiquidityPoolState

        // stage: state validation (requires balance snapshots for sizing / tick math)
        if (!bot.balanceSnapshots) {
            throw new BalanceSnapshotsNotFoundException({
                botId: bot.id,
            })
        }
        // stage: state validation (pool must have CLMM static state)
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
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        // stage: state validation (pool token metadata must exist)
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }

        // Determine if target token is token A
        const targetIsA = bot.targetToken.toString() === tokenA.id
        // get range tier
        const tier = this.mountStorageService.appConfig.rangeTiers.tiers.find((tier) => tier.tier === bot.rangeTier)
        if (!tier) {
            throw new RangeTierNotConfiguredException({
                rangeTier: bot.rangeTier,
            })
        }
        // calculate tick multiplier based on range tier and tick spacing
        const tickMultiplier = new Decimal(tier.ticks).div(new Decimal(liquidityPool.clmmState.tickSpacing)).ceil()
        // Find optimal tick range based on balance amounts
        const {
            tickLower,
            tickUpper,
            liquidity,
        } = await this.tickMathService.findOptimalTickRange({
            tickCurrent: _state.tickCurrent,
            tickSpacing: new Decimal(liquidityPool.clmmState.tickSpacing),
            tickMultiplier: tickMultiplier,
            targetBalanceAmount: snapshotTargetBalanceAmountBN,
            quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
            targetIsA,
        })

        // Calculate amounts based on target token
        const amountA = targetIsA ? snapshotTargetBalanceAmountBN : snapshotQuoteBalanceAmountBN
        const amountB = targetIsA ? snapshotQuoteBalanceAmountBN : snapshotTargetBalanceAmountBN

        // Adjust liquidity for slippage
        const liquidityAdjusted = adjustSlippage({
            bn: liquidity,
            slippage: new Decimal(envConfig().dexes.orca.openPosition.slippage),
            isRoundUp: false,
        })
        // Create open position instructions
        const {
            mintKeyPair,
            ataAddress,
            instructions: openPositionInstructions,
            personalPosition,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            liquidityPool,
            liquidity: liquidityAdjusted,
            amountA,
            amountB,
            tickLower,
            tickUpper,
        })

        const metadata: OrcaPositionMetadata = {
            ataAddress: ataAddress.toString(),
            nftMintAddress: mintKeyPair.publicKey.toBase58(),
        }
        return {
            prepareTxs: [{
                chainId: ChainId.Solana,
                serializedTx: this.superJson.stringify(openPositionInstructions),
                privateKeys: [
                    bs58.encode(mintKeyPair.secretKey),
                ],
            }],
            amountA,
            amountB,
            positionId: personalPosition.toString(),
            metadata,
            tickLower,
            tickUpper,
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
     * @param param.signedTx - Signed transaction (from prepare)
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

    /**
     * Signs an open position transaction.
     *
     * Stage: signing
     * - Sign with V1 signer or Privy (V2)
     *
     * @param param - Parameters for signing open position
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared unsigned transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
        liquidityPool,
    }: SignOpenPositionParams): Promise<SignOpenPositionResult> {
        return {
            signedTx: await this.solanaTxService.signTx({
                bot,
                prepareTx,
                transactionType: TransactionType.OpenPosition,
                liquidityPool,
            }),
        }
    }
}
