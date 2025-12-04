import { Injectable } from "@nestjs/common"
import {
    AccountRole,
    Instruction,
    address,
} from "@solana/kit"
import { AtaInstructionService, AnchorUtilsService, WSOL_MINT_ADDRESS } from "../../../tx-builder"
import { BotSchema, MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { DlmmLiquidityPoolState } from "../../../interfaces"
import { ActivePositionNotFoundException, InvalidPoolTokensException } from "@exceptions"
import { EventAuthorityService } from "./event-authority.service"
import BN from "bn.js"
import { deriveBinArrayBitmapExtension, getBinArrayAccountMetasCoverage } from "@meteora-ag/dlmm"
import { PublicKey } from "@solana/web3.js"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { MEMO_PROGRAM_ADDRESS } from "@solana-program/memo"
import { bignum, FixableBeetArgsStruct, i32, u16, u64 } from "@metaplex-foundation/beet"
import { RemainingAccountsInfoArgs, RemainingAccountsInfoType } from "./sdk.service"
import { convertWeb3MetaToKitMeta } from "@utils"
import { RewardInfo } from "../beets"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { ChainId } from "@typedefs"
import { LoadBalancerService } from "@modules/mixin"
import { LoadBalancerName } from "@modules/databases"

export interface CreateCloseInstructionsParams {
    bot: BotSchema
    state: DlmmLiquidityPoolState
}

@Injectable()
export class ClosePositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly eventAuthorityService: EventAuthorityService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly loadBalancerService: LoadBalancerService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
    }: CreateCloseInstructionsParams)
    : Promise<Array<Instruction>>
    {
        const url = this.loadBalancerService.balanceP2c(LoadBalancerName.MeteoraDlmm, this.primaryMemoryStorageService.clientConfig.meteoraDlmmClientRpcs)
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        const {
            instructions: createAtaAInstructions,
            endInstructions: closeAtaAInstructions,
            ataAddress: ataAAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            url,
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
            url,
            amount: new BN(0),
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const {
            programAddress,
            reserveXAddress,
            reserveYAddress,
        } = state.static.metadata as MeteoraLiquidityPoolMetadata
        const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
            programAddress: address(programAddress),
        })
        const [binArrayTickmapExtensionPda] = deriveBinArrayBitmapExtension(
            new PublicKey(state.static.poolAddress),
            new PublicKey(programAddress),
        )
        const [removeLiquidityByRange2Args] = RemoveLiquidityByRange2Args.serialize({
            fromBinId: bot.activePosition.minBinId || 0,
            toBinId: bot.activePosition.maxBinId || 0,
            bpsToRemove: 10000,
            remainingAccountsInfo: {
                slices: [],
            },
        })
        const binArrayAccountsMeta = getBinArrayAccountMetasCoverage(
            new BN(bot.activePosition.minBinId || 0),
            new BN(bot.activePosition.maxBinId || 0),
            new PublicKey(state.static.poolAddress),
            new PublicKey(programAddress)
        )
        const removeLiquidityByRange2Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.activePosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(binArrayTickmapExtensionPda.toString()),
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
                    address: address(reserveXAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(reserveYAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(tokenA.tokenAddress ? address(tokenA.tokenAddress) : WSOL_MINT_ADDRESS),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(tokenB.tokenAddress ? address(tokenB.tokenAddress) : WSOL_MINT_ADDRESS),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: tokenA.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenB.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: MEMO_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: eventAuthorityPda,
                    role: AccountRole.READONLY,
                },
                {
                    address: address(programAddress),
                    role: AccountRole.READONLY,
                },
                ...binArrayAccountsMeta.map((accountMeta) => convertWeb3MetaToKitMeta(accountMeta)),
            ],
            data: this.anchorUtilsService.encodeAnchorIx("remove_liquidity_by_range2", removeLiquidityByRange2Args),
        }
        instructions.push(removeLiquidityByRange2Instruction)
        const [claimFee2Args] = ClaimFee2Args.serialize({
            minBinId: bot.activePosition.minBinId || 0,
            maxBinId: bot.activePosition.maxBinId || 0,
            remainingAccountsInfo: {
                slices: [],
            },
        })
        const claimFee2Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(bot.activePosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(reserveXAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(reserveYAddress),
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
                    address: address(tokenA.tokenAddress ? address(tokenA.tokenAddress) : WSOL_MINT_ADDRESS),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(tokenB.tokenAddress ? address(tokenB.tokenAddress) : WSOL_MINT_ADDRESS),
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenA.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenB.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: MEMO_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: eventAuthorityPda,
                    role: AccountRole.READONLY,
                },
                {
                    address: address(programAddress),
                    role: AccountRole.READONLY,
                },
                ...binArrayAccountsMeta.map((accountMeta) => convertWeb3MetaToKitMeta(accountMeta)),
            ],
            data: this.anchorUtilsService.encodeAnchorIx("claim_fee2", claimFee2Args),
        }
        instructions.push(claimFee2Instruction)
        for (let i = 0; i < 2; i++) {
            const [claimReward2Args] = ClaimReward2Args.serialize({
                rewardIndex: new BN(i),
                minBinId: bot.activePosition.minBinId || 0,
                maxBinId: bot.activePosition.maxBinId || 0,
                remainingAccountsInfo: {
                    slices: [],
                },
            })  
            const rewardInfo = state.dynamic.rewards[i] as RewardInfo
            if (!rewardInfo || address(rewardInfo.mint.toString()) === address(SYSTEM_PROGRAM_ADDRESS))
                continue
            const {
                instructions: createAtaRewardInstructions,
                endInstructions: closeAtaRewardInstructions,
                ataAddress: ataRewardAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                tokenMint: address(rewardInfo.mint.toString()),
                ownerAddress: address(bot.accountAddress),
                is2022Token: false,
                url,
            })
            if (createAtaRewardInstructions?.length) {
                instructions.push(...createAtaRewardInstructions)
            }
            if (closeAtaRewardInstructions?.length) {
                endInstructions.push(...closeAtaRewardInstructions)
            }
            const token = this.primaryMemoryStorageService.tokens.find((token) => 
                token.tokenAddress === rewardInfo.mint.toString()
                && token.chainId === ChainId.Solana
            )
            const claimReward2Instruction: Instruction = {
                programAddress: address(programAddress),
                accounts: [
                    {
                        address: address(state.static.poolAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(bot.activePosition.positionId),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(bot.accountAddress),
                        role: AccountRole.WRITABLE_SIGNER,
                    },
                    {
                        address: address(rewardInfo.vault.toString()),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: token?.tokenAddress ? address(token.tokenAddress) : WSOL_MINT_ADDRESS,
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(ataRewardAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: token?.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                        role: AccountRole.READONLY,
                    },
                    {
                        address: MEMO_PROGRAM_ADDRESS,
                        role: AccountRole.READONLY,
                    },
                    {
                        address: address(eventAuthorityPda),
                        role: AccountRole.READONLY,
                    },
                    {
                        address: address(programAddress),
                        role: AccountRole.READONLY,
                    },
                    ...binArrayAccountsMeta.map((accountMeta) => convertWeb3MetaToKitMeta(accountMeta)),
                ],
                data: this.anchorUtilsService.encodeAnchorIx("claim_reward2", claimReward2Args),
            }
            instructions.push(claimReward2Instruction)
        }
        const closePositionIfEmptyInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.activePosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                // account address
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // renter
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(eventAuthorityPda),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(programAddress),
                    role: AccountRole.READONLY,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx("close_position_if_empty"),
        }
        instructions.push(closePositionIfEmptyInstruction, ...endInstructions)
        return instructions
    }
}

export interface RemoveLiquidityByRange2ArgsType {
    fromBinId: number
    toBinId: number
    bpsToRemove: number
    remainingAccountsInfo: RemainingAccountsInfoType
}
export const RemoveLiquidityByRange2Args = new FixableBeetArgsStruct<RemoveLiquidityByRange2ArgsType>(
    [
        ["fromBinId", i32],
        ["toBinId", i32],
        ["bpsToRemove", u16],
        ["remainingAccountsInfo", RemainingAccountsInfoArgs],
    ],
    "RemoveLiquidityByRange2Args"
)


export interface ClaimFee2ArgsType {
    minBinId: number
    maxBinId: number
    remainingAccountsInfo: RemainingAccountsInfoType
}
export const ClaimFee2Args = new FixableBeetArgsStruct<ClaimFee2ArgsType>(
    [
        ["minBinId", i32],
        ["maxBinId", i32],
        ["remainingAccountsInfo", RemainingAccountsInfoArgs],
    ],
    "ClaimFee2Args"
)

export interface ClaimReward2ArgsType {
    rewardIndex: bignum
    minBinId: number
    maxBinId: number
    remainingAccountsInfo: RemainingAccountsInfoType
}
export const ClaimReward2Args = new FixableBeetArgsStruct<ClaimReward2ArgsType>(
    [
        ["rewardIndex", u64],
        ["minBinId", i32],
        ["maxBinId", i32],
        ["remainingAccountsInfo", RemainingAccountsInfoArgs],
    ],
    "ClaimReward2Args"
)