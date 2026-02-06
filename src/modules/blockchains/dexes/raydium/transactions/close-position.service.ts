import {
    Injectable 
} from "@nestjs/common"
import {
    AccountMeta,
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import {
    SYSTEM_PROGRAM_ADDRESS 
} from "@solana-program/system"
import {
    TOKEN_2022_PROGRAM_ADDRESS 
} from "@solana-program/token-2022"
import {
    TOKEN_PROGRAM_ADDRESS 
} from "@solana-program/token"
import BN from "bn.js"
import { 
    AnchorUtilsService, 
    AtaInstructionService, 
    WSOL_MINT_ADDRESS 
} from "../../../tx-builder"
import {
    BotSchema,
    PrimaryMemoryStorageService, 
    RaydiumLiquidityPoolMetadata, 
    RaydiumPositionMetadata
} from "@modules/databases"
import {
    ClmmLiquidityPoolState 
} from "../../../interfaces"
import {
    ActivePositionNotFoundException, InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException,
    PositionClmmStateNotFoundException
} from "@modules/exceptions"
import {
    TickArrayService 
} from "./tick-array.service"
import {
    MEMO_PROGRAM_ADDRESS 
} from "@solana-program/memo"
import {
    u128, u64, BeetArgsStruct 
} from "@metaplex-foundation/beet"
import {
    CreateCloseInstructionsParams
} from "../types"

/**
 * Service responsible for creating close position instructions for Raydium.
 * Handles instruction construction for closing liquidity positions.
 *
 * @example
 * const service = new ClosePositionInstructionService(...)
 * const result = await service.createCloseInstructions({ bot, state })
 */
@Injectable()
export class ClosePositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickArrayService: TickArrayService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
    }: CreateCloseInstructionsParams)
        : Promise<Array<Instruction>> {
        const _state = state as ClmmLiquidityPoolState
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }   
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new PositionClmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: state.static.tokenA.toString()
            }
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: state.static.tokenB.toString()
            }
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: state.static.displayId,
            })
        }
        const {
            programAddress,
            tokenVault0,
            tokenVault1,
        } = state.static.metadata as RaydiumLiquidityPoolMetadata
        const {
            nftMintAddress,
            ataAddress
        } = bot.activePosition.associatedPosition?.metadata as RaydiumPositionMetadata
        const personalPositionPda = address(bot.activePosition.associatedPosition?.positionId)  
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: new BN(bot.activePosition.associatedPosition?.clmmState.tickLower),
            tickSpacing: new BN(_state.static.clmmState.tickSpacing),
            programAddress: address(programAddress),
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: new BN(bot.activePosition.associatedPosition?.clmmState.tickUpper),
            tickSpacing: new BN(_state.static.clmmState.tickSpacing),
            programAddress: address(programAddress),
        })
        const {
            instructions: createAtaAInstructions,
            endInstructions: closeAtaAInstructions,
            ataAddress: ataAAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            amount: new BN(0),
        })
        if (createAtaAInstructions?.length) {
            instructions.push(...createAtaAInstructions)
        }
        if (closeAtaAInstructions?.length) {
            endInstructions.push(...closeAtaAInstructions)
        }
        const {
            instructions: createAtaBInstructions,
            endInstructions: closeAtaBInstructions,
            ataAddress: ataBAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenB.is2022Token,
            amount: new BN(0),
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const remainingAccounts: Array<AccountMeta<string>> = []
        for (const reward of state.dynamic.rewards) {
            if (reward.tokenAddress.toString() === SYSTEM_PROGRAM_ADDRESS) {
                continue
            }
            remainingAccounts.push({
                address: address(reward.vaultAddress?.toString() ?? ""),
                role: AccountRole.WRITABLE,
            })
            const {
                instructions: createAtaRewardInstructions,
                endInstructions: closeAtaRewardInstructions,
                ataAddress: ataRewardAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                tokenMint: address(reward.tokenAddress.toString()),
                ownerAddress: address(bot.accountAddress),
                is2022Token: false,
            })
            if (createAtaRewardInstructions?.length) {
                instructions.push(...createAtaRewardInstructions)
            }
            if (closeAtaRewardInstructions?.length) {
                endInstructions.push(...closeAtaRewardInstructions)
            }
            remainingAccounts.push({
                address: address(ataRewardAddress),
                role: AccountRole.WRITABLE,
            })
            remainingAccounts.push({
                address: address(reward.tokenAddress.toString()),
                role: AccountRole.READONLY,
            })
        }
        const [closePositionArgs] = ClosePositionArgs.serialize({
            liquidity: new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
            amount0Max: new BN(0).toString(),
            amount1Max: new BN(0).toString(),
        })
        const decreaseLiquidityV2Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: personalPositionPda,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: SYSTEM_PROGRAM_ADDRESS, // protocol_position (deprecated)
                    role: AccountRole.READONLY,
                },
                {
                    address: address(tokenVault0),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(tokenVault1),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: tickArrayLowerPda,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: tickArrayUpperPda,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: ataAAddress,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: ataBAddress,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: TOKEN_2022_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: MEMO_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenA.tokenAddress ? address(tokenA.tokenAddress) : WSOL_MINT_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenB.tokenAddress ? address(tokenB.tokenAddress) : WSOL_MINT_ADDRESS,
                    role: AccountRole.READONLY,
                },
                ...remainingAccounts,
            ],
            data:
                this.anchorUtilsService.encodeAnchorIx(
                    "decrease_liquidity_v2",
                    closePositionArgs
                ),
        }
        instructions.push(decreaseLiquidityV2Instruction)
        const closePositionInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(nftMintAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: personalPositionPda,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: TOKEN_2022_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                }
            ],
            data: this.anchorUtilsService.encodeAnchorIx("close_position"),
        }
        instructions.push(closePositionInstruction)
        instructions.push(...endInstructions)
        return instructions
    }
}

export const ClosePositionArgs = new BeetArgsStruct(
    [
        ["liquidity",
            u128],
        ["amount0Max",
            u64],
        ["amount1Max",
            u64],
    ],
    "ClosePositionArgs"
)