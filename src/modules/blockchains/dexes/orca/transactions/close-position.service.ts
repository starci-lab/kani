import {
    Injectable 
} from "@nestjs/common"
import {
    AccountRole, address, Instruction 
} from "@solana/kit"
import {
    TOKEN_2022_PROGRAM_ADDRESS 
} from "@solana-program/token-2022"
import {
    TOKEN_PROGRAM_ADDRESS 
} from "@solana-program/token"
import BN from "bn.js"
import {
    AnchorUtilsService, AtaInstructionService 
} from "../../../tx-builder"
import {
    PrimaryMemoryStorageService,
    RaydiumLiquidityPoolMetadata,
    OrcaPositionMetadata,
} from "@modules/databases"
import {
    ClmmLiquidityPoolState 
} from "../../types"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    LiquidityPoolClmmStateNotFoundException,
    PositionClmmStateNotFoundException,
} from "@modules/exceptions"
import {
    u128, u64, BeetArgsStruct 
} from "@metaplex-foundation/beet"
import {
    PositionService 
} from "./position.service"
import {
    TickArrayService 
} from "./tick-array.service"
import {
    CreateCloseInstructionsParams
} from "../types"

/**
 * Service responsible for creating close position instructions for Orca.
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
    private readonly positionService: PositionService,
    private readonly tickArrayService: TickArrayService,
    ) {}
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
    }: CreateCloseInstructionsParams): Promise<Array<Instruction>> {
        const _state = state as ClmmLiquidityPoolState
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
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
        if (!_state.static.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const { ataAddress, nftMintAddress } = bot.activePosition.associatedPosition.metadata as OrcaPositionMetadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const { programAddress, tokenVault0, tokenVault1 } = _state.static
            .metadata as RaydiumLiquidityPoolMetadata 
        const { pda: positionPda } = await this.positionService.getPda({
            nftMintAddress: address(nftMintAddress),
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
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: new BN(bot.activePosition.associatedPosition.clmmState.tickLower),
            tickSpacing: new BN(_state.static.clmmState.tickSpacing),
            programAddress: address(programAddress),
            bot,
            pdaOnly: true,
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: new BN(bot.activePosition.associatedPosition.clmmState.tickUpper),
            tickSpacing: new BN(_state.static.clmmState.tickSpacing),
            programAddress: address(programAddress),
            pdaOnly: true,
        })
        const [decreaseLiquidityArgs] = DecreaseLiquidityArgs.serialize({
            liquidityAmount: new BN(bot.activePosition.associatedPosition.clmmState.liquidity).toString(),
            tokenMinA: new BN(0).toString(),
            tokenMinB: new BN(0).toString(),
        })
        const decreaseLiquidityInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(TOKEN_PROGRAM_ADDRESS),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(positionPda),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataBAddress),
                    role: AccountRole.WRITABLE,
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
            ],
            data: this.anchorUtilsService.encodeAnchorIx({
                ixName: "decrease_liquidity",
                data: decreaseLiquidityArgs,
            }),
        }
        instructions.push(decreaseLiquidityInstruction)
        const collectFeesInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(positionPda),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(tokenVault0),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataBAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(tokenVault1),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx({
                ixName: "collect_fees",
            }),
        }
        instructions.push(collectFeesInstruction)
        const closePositionWithTokenExtensionsInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(positionPda),
                    role: AccountRole.WRITABLE,
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
                    address: TOKEN_2022_PROGRAM_ADDRESS,
                    role: AccountRole.WRITABLE,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx({
                ixName: "close_position_with_token_extensions",
            }),
        }

        instructions.push(closePositionWithTokenExtensionsInstruction)
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
    "ClosePositionArgs",
)

export const DecreaseLiquidityArgs = new BeetArgsStruct(
    [
        ["liquidityAmount",
            u128],
        ["tokenMinA",
            u64],
        ["tokenMinB",
            u64],
    ],
    "DecreaseLiquidityArgs",
)
