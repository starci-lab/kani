import { Injectable } from "@nestjs/common"
import { AccountRole, address, Instruction } from "@solana/kit"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import BN from "bn.js"
import { AnchorUtilsService, AtaInstructionService } from "../../../tx-builder"
import {
    BotSchema,
    PrimaryMemoryStorageService,
    RaydiumLiquidityPoolMetadata,
    OrcaPositionMetadata,
    LoadBalancerName,
} from "@modules/databases"
import { LiquidityPoolState } from "../../../interfaces"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
} from "@exceptions"
import { u128, u64, BeetArgsStruct } from "@metaplex-foundation/beet"
import { PositionService } from "./position.service"
import { TickArrayService } from "./tick-array.service"

export interface CreateCloseInstructionsParams {
  bot: BotSchema;
  state: LiquidityPoolState;
}

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
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const { programAddress, tokenVault0, tokenVault1 } = state.static
            .metadata as RaydiumLiquidityPoolMetadata
        const { nftMintAddress } = bot.activePosition
            .metadata as OrcaPositionMetadata
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
            loadBalancerName: LoadBalancerName.OrcaClmm,
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
            loadBalancerName: LoadBalancerName.OrcaClmm,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: bot.activePosition.tickLower ?? 0,
            tickSpacing: state.static.tickSpacing,
            programAddress: address(programAddress),
            bot,
            pdaOnly: true,
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: bot.activePosition.tickUpper ?? 0,
            tickSpacing: state.static.tickSpacing,
            programAddress: address(programAddress),
            pdaOnly: true,
        })
        const [decreaseLiquidityArgs] = DecreaseLiquidityArgs.serialize({
            liquidityAmount: bot.activePosition.liquidity?.toString(),
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
                    address: address(bot.activePosition.positionId),
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
            data: this.anchorUtilsService.encodeAnchorIx(
                "decrease_liquidity",
                decreaseLiquidityArgs,
            ),
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
                    address: address(bot.activePosition.positionId),
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
            data: this.anchorUtilsService.encodeAnchorIx("collect_fees"),
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
                    address: address(bot.activePosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: TOKEN_2022_PROGRAM_ADDRESS,
                    role: AccountRole.WRITABLE,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                "close_position_with_token_extensions",
            ),
        }

        instructions.push(closePositionWithTokenExtensionsInstruction)
        instructions.push(...endInstructions)
        return instructions
    }
}

export const ClosePositionArgs = new BeetArgsStruct(
    [
        ["liquidity", u128],
        ["amount0Max", u64],
        ["amount1Max", u64],
    ],
    "ClosePositionArgs",
)

export const DecreaseLiquidityArgs = new BeetArgsStruct(
    [
        ["liquidityAmount", u128],
        ["tokenMinA", u64],
        ["tokenMinB", u64],
    ],
    "DecreaseLiquidityArgs",
)
