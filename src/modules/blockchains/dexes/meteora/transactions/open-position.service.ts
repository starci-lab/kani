import {
    Injectable 
} from "@nestjs/common"
import {
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import {
    AtaInstructionService, 
    AnchorUtilsService,
    SolanaKeypairService
} from "../../../tx-builder"
import {
    MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    i32, BeetArgsStruct 
} from "@metaplex-foundation/beet"
import { 
    buildLiquidityStrategyParameters, 
    getBinCount, 
    getLiquidityStrategyParameterBuilder, 
    getPositionCountByBinCount, 
    StrategyType
} from "@meteora-ag/dlmm"
import Decimal from "decimal.js"
import BN from "bn.js"
import {
    InvalidPoolTokensException, 
    LiquidityPoolDlmmStateNotFoundException, 
    MeteoraMultipleDlmmPositionsNotSupportedException 
} from "@modules/exceptions"
import {
    SYSTEM_PROGRAM_ADDRESS 
} from "@solana-program/system"
import {
    SYSVAR_RENT_ADDRESS 
} from "@solana/sysvars"
import {
    EventAuthorityService 
} from "./event-authority.service"
import {
    MeteoraSdkService 
} from "./sdk.service"
import {
    envConfig 
} from "@modules/env"
import {
    CreateOpenPositionInstructionsParams,
    CreateOpenPositionInstructionsResult
} from "../types"

/**
 * Service responsible for creating open position instructions for Meteora.
 * Handles instruction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionInstructionService(...)
 * const result = await service.createOpenPositionInstructions({ bot, state, amountA, amountB })
 */
@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly eventAuthorityService: EventAuthorityService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaKeypairService: SolanaKeypairService,
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly meteoraSdkService: MeteoraSdkService,
    ) { }
    /**
     * Creates open position instructions for Meteora.
     * @param bot - The bot.
     * @param state - The state.
     * @param amountA - The amount of token A.
     * @param amountB - The amount of token B.
     * @returns The open position instructions.
     */
    async createOpenPositionInstructions(
        {
            bot,
            state,
            amountA,
            liquidityPool,
            amountB,
        }: CreateOpenPositionInstructionsParams
    )
    : Promise<CreateOpenPositionInstructionsResult>
    {
        if (!liquidityPool.dlmmState) {
            throw new LiquidityPoolDlmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const remainingAmountA = amountA
        const remainingAmountB = amountB
        const metadata = liquidityPool.metadata as MeteoraLiquidityPoolMetadata
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
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        const minBinId = state.activeId.sub(new BN(liquidityPool.dlmmState.binOffset))
        const maxBinId = state.activeId.add(new BN(liquidityPool.dlmmState.binOffset))
        const binCount = getBinCount(minBinId.toNumber(),
            maxBinId.toNumber())
        const positionCount = getPositionCountByBinCount(binCount)
        if (positionCount > 1) {
            throw new MeteoraMultipleDlmmPositionsNotSupportedException({
                positionCount,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const positionKeyPair = await this.solanaKeypairService.generateKeypair()
        const liquidityStrategyParameters = buildLiquidityStrategyParameters(
            remainingAmountA,
            remainingAmountB,
            minBinId.sub(state.activeId),
            maxBinId.sub(state.activeId),
            new BN(liquidityPool.dlmmState.binStep),
            false,
            state.activeId,
            getLiquidityStrategyParameterBuilder(StrategyType.Curve)
        )
        const { ataAddress: ataAAddress } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            pdaOnly: true,
        })
        const { ataAddress: ataBAddress } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenB.is2022Token,
            pdaOnly: true,
        })
        const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
            programAddress: address(metadata.programAddress),
        })
        const [
            openPositionArgs
        ] = OpenPositionArgs.serialize({
            lowerBinId: minBinId.toNumber(),
            width: binCount,
        })
        const initializePositionInstruction: Instruction = {
            programAddress: address(metadata.programAddress),
            accounts: [
                // payer
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // position owner
                {
                    address: address(positionKeyPair.publicKey.toBase58()),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // pool address
                {
                    address: address(liquidityPool.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                // owner
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE,
                },
                // system program
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // rent 
                {
                    address: SYSVAR_RENT_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // event authority
                {
                    address: address(eventAuthorityPda),
                    role: AccountRole.READONLY,
                },
                // dlmm metadata program
                {
                    address: address(metadata.programAddress),
                    role: AccountRole.READONLY,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                {
                    ixName: "initialize_position",
                    data: openPositionArgs,
                }
            ),
        }
        instructions.push(initializePositionInstruction)
        const slippagePercentage = new Decimal(envConfig().dexes.meteora.openPosition.slippage)
        const depositWithRebalanceEndpointInstructions 
        = await this.meteoraSdkService.depositWithRebalanceEndpoint({
            bot,
            state,
            liquidityPool,
            strategy: {
                minBinId: minBinId.toNumber(),
                maxBinId: maxBinId.toNumber(),
                strategyType: StrategyType.Spot,
                singleSidedX: false,
            },
            slippagePercentage: slippagePercentage.toNumber(),
            maxActiveBinSlippage: slippagePercentage.toNumber(),
            positionAddress: address(positionKeyPair.publicKey.toBase58()),
            positionMinBinId: minBinId.toNumber(),
            positionMaxBinId: maxBinId.toNumber(),
            liquidityStrategyParameters,
            ataAddressA: ataAAddress,
            ataAddressB: ataBAddress,
        })
        instructions.push(...depositWithRebalanceEndpointInstructions)
        instructions.push(...endInstructions)
        return {
            instructions,
            positionKeyPair,
            minBinId,
            maxBinId,
        }
    }
}
export const OpenPositionArgs = new BeetArgsStruct(
    [
        ["lowerBinId",
            i32],
        ["width",
            i32],
    ],
    "OpenPositionArgs"
)
