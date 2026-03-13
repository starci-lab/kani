import {
    Injectable 
} from "@nestjs/common"
import {
    AccountRole,
    Instruction,
    address,
} from "@solana/kit"
import {
    AtaInstructionService, AnchorUtilsService, WSOL_MINT_ADDRESS 
} from "../../../tx-builder"
import {
    MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    ActivePositionNotFoundException, InvalidPoolTokensException, PositionDlmmStateNotFoundException 
} from "@modules/exceptions"
import {
    EventAuthorityService 
} from "./event-authority.service"
import BN from "bn.js"
import {
    deriveBinArrayBitmapExtension, getBinArrayAccountMetasCoverage 
} from "@meteora-ag/dlmm"
import {
    PublicKey 
} from "@solana/web3.js"
import {
    TOKEN_2022_PROGRAM_ADDRESS 
} from "@solana-program/token-2022"
import {
    TOKEN_PROGRAM_ADDRESS 
} from "@solana-program/token"
import {
    MEMO_PROGRAM_ADDRESS 
} from "@solana-program/memo"
import {
    RemoveLiquidityByRange2Args,
    ClaimFee2Args,
    ClaimReward2Args
} from "./sdk.service"
import {
    ChainId,
    convertWeb3MetaToKitMeta 
} from "@modules/common"
import {
    SYSTEM_PROGRAM_ADDRESS 
} from "@solana-program/system"
import {
    CreateCloseInstructionsParams
} from "../types"

/**
 * Service responsible for creating close position instructions for Meteora.
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
        private readonly eventAuthorityService: EventAuthorityService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
        liquidityPool,
    }: CreateCloseInstructionsParams)
    : Promise<Array<Instruction>>
    {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.dlmmState) {
            throw new PositionDlmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
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
        const {
            programAddress,
            reserveXAddress,
            reserveYAddress,
        } = liquidityPool.metadata as MeteoraLiquidityPoolMetadata
        const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
            programAddress: address(programAddress),
        })
        const [binArrayTickmapExtensionPda] = deriveBinArrayBitmapExtension(
            new PublicKey(liquidityPool.poolAddress),
            new PublicKey(programAddress),
        )
        const [removeLiquidityByRange2Args] = RemoveLiquidityByRange2Args.serialize({
            fromBinId: bot.activePosition.associatedPosition.dlmmState.minBinId,
            toBinId: bot.activePosition.associatedPosition.dlmmState.maxBinId,
            bpsToRemove: 10000,
            remainingAccountsInfo: {
                slices: [],
            },
        })
        const binArrayAccountsMeta = getBinArrayAccountMetasCoverage(
            new BN(bot.activePosition.associatedPosition.dlmmState.minBinId),
            new BN(bot.activePosition.associatedPosition.dlmmState.maxBinId),
            new PublicKey(liquidityPool.poolAddress),
            new PublicKey(programAddress)
        )
        const removeLiquidityByRange2Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.activePosition.associatedPosition.positionId),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(liquidityPool.poolAddress),
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
            data: this.anchorUtilsService.encodeAnchorIx(
                {   
                    ixName: "remove_liquidity_by_range2",
                    data: removeLiquidityByRange2Args,
                }
            ),
        }
        instructions.push(removeLiquidityByRange2Instruction)
        const [claimFee2Args] = ClaimFee2Args.serialize({
            minBinId: bot.activePosition.associatedPosition.dlmmState.minBinId,
            maxBinId: bot.activePosition.associatedPosition.dlmmState.maxBinId,
            remainingAccountsInfo: {
                slices: [],
            },
        })
        const claimFee2Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(liquidityPool.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(bot.activePosition.associatedPosition.positionId),
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
            data: this.anchorUtilsService.encodeAnchorIx(
                {
                    ixName: "claim_fee2",
                    data: claimFee2Args,
                }
            ),
        }
        instructions.push(claimFee2Instruction)
        for (let i = 0; i < 2; i++) {
            const [claimReward2Args] = ClaimReward2Args.serialize({
                rewardIndex: new BN(i),
                minBinId: bot.activePosition.associatedPosition.dlmmState.minBinId,
                maxBinId: bot.activePosition.associatedPosition.dlmmState.maxBinId,
                remainingAccountsInfo: {
                    slices: [],
                },
            })  
            const rewardInfo = state.rewards[i]
            if (!rewardInfo || address(rewardInfo.tokenAddress.toString()) === address(SYSTEM_PROGRAM_ADDRESS))
                continue
            const {
                instructions: createAtaRewardInstructions,
                endInstructions: closeAtaRewardInstructions,
                ataAddress: ataRewardAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                tokenMint: address(rewardInfo.tokenAddress.toString()),
                ownerAddress: address(bot.accountAddress),
                is2022Token: false,
            })
            if (createAtaRewardInstructions?.length) {
                instructions.push(...createAtaRewardInstructions)
            }
            if (closeAtaRewardInstructions?.length) {
                endInstructions.push(...closeAtaRewardInstructions)
            }
            const tokenAddress = rewardInfo.tokenAddress.toString()
            let is2022Token = false
            const token = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                (t) => t.tokenAddress === rewardInfo.tokenAddress.toString() && t.chainId === ChainId.Solana,
            )
            if (token) {
                is2022Token = token.is2022Token || false
            } else {
                is2022Token = false
            }
            const claimReward2Instruction: Instruction = {
                programAddress: address(programAddress),
                accounts: [
                    {
                        address: address(liquidityPool.poolAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(bot.activePosition.associatedPosition.positionId),
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
                        address: address(tokenAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(ataRewardAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
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
                data: this.anchorUtilsService.encodeAnchorIx(
                    {
                        ixName: "claim_reward2",
                        data: claimReward2Args,
                    }
                ),
            }
            instructions.push(claimReward2Instruction)
        }
        const closePositionIfEmptyInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.activePosition.associatedPosition.positionId),
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
            data: this.anchorUtilsService.encodeAnchorIx(
                {
                    ixName: "close_position_if_empty",
                }
            ),
        }
        instructions.push(closePositionIfEmptyInstruction,
            ...endInstructions)
        return instructions
    }
}
