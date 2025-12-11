import { Injectable } from "@nestjs/common"
import {
    AccountMeta,
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import BN from "bn.js"
import { 
    AnchorUtilsService, 
    AtaInstructionService, 
    WSOL_MINT_ADDRESS 
} from "../../../tx-builder"
import {
    BotSchema,
    LoadBalancerName, 
    PrimaryMemoryStorageService, 
    RaydiumLiquidityPoolMetadata, 
    RaydiumPositionMetadata
} from "@modules/databases"
import { LiquidityPoolState } from "../../../interfaces"
import { ActivePositionNotFoundException, InvalidPoolTokensException } from "@exceptions"
import { TickArrayService } from "./tick-array.service"
import { MEMO_PROGRAM_ADDRESS } from "@solana-program/memo"
import { PersonalPositionService } from "./personal-position.service"
import { u128, u64, BeetArgsStruct } from "@metaplex-foundation/beet"
import { RaydiumRewardInfo } from "../observer.service"

export interface CreateCloseInstructionsParams {
    bot: BotSchema
    state: LiquidityPoolState
}

@Injectable()
export class ClosePositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickArrayService: TickArrayService,
        private readonly personalPositionService: PersonalPositionService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
    }: CreateCloseInstructionsParams)
        : Promise<Array<Instruction>> {
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const {
            programAddress,
            tokenVault0,
            tokenVault1,
        } = state.static.metadata as RaydiumLiquidityPoolMetadata
        const {
            nftMintAddress,
        } = bot.activePosition.metadata as RaydiumPositionMetadata
        const {
            pda: personalPositionPda,
        } = await this.personalPositionService.getPda({
            nftMintAddress: address(nftMintAddress),
            programAddress: address(programAddress),
        })
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: bot.activePosition.tickLower ?? 0,
            tickSpacing: state.static.tickSpacing,
            programAddress: address(programAddress),
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: bot.activePosition.tickUpper ?? 0,
            tickSpacing: state.static.tickSpacing,
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
            loadBalancerName: LoadBalancerName.RaydiumClmm,
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
            loadBalancerName: LoadBalancerName.RaydiumClmm,
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
            const _reward = reward as RaydiumRewardInfo
            if (_reward.tokenMint.toString() === SYSTEM_PROGRAM_ADDRESS) {
                continue
            }
            remainingAccounts.push({
                address: address(_reward.tokenVault.toString()),
                role: AccountRole.WRITABLE,
            })
            const {
                instructions: createAtaRewardInstructions,
                endInstructions: closeAtaRewardInstructions,
                ataAddress: ataRewardAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                tokenMint: address(_reward.tokenMint.toString()),
                ownerAddress: address(bot.accountAddress),
                is2022Token: false,
                loadBalancerName: LoadBalancerName.RaydiumClmm,
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
                address: address(_reward.tokenMint.toString()),
                role: AccountRole.READONLY,
            })
        }
        const [closePositionArgs] = ClosePositionArgs.serialize({
            liquidity: bot.activePosition.liquidity?.toString(),
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
                    address: address(bot.activePosition.positionId),
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
                    address: address(bot.activePosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(personalPositionPda),
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
        ["liquidity", u128],
        ["amount0Max", u64],
        ["amount1Max", u64],
    ],
    "ClosePositionArgs"
)