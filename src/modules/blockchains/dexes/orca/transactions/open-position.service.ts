import {
    Injectable 
} from "@nestjs/common"
import {
    AnchorUtilsService, AtaInstructionService 
} from "../../../tx-builder"
import {
    OrcaLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import {
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException
} from "@modules/exceptions"
import {
    TickArrayService 
} from "./tick-array.service"
import {
    PositionService 
} from "./position.service"
import {
    ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token"
import {
    SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system"
import {
    BeetArgsStruct,
    bool,
    i32,
    u128,
    u64,
} from "@metaplex-foundation/beet"
import {
    TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022"
import {
    METADATA_UPDATE_AUTH_ADDRESS 
} from "./constants"
import BN from "bn.js"
import {
    CreateOpenPositionInstructionsParams,
    CreateOpenPositionInstructionsResult
} from "../types"
import {
    SolanaKeypairService
} from "../../../tx-builder"

/**
 * Service responsible for creating open position instructions for Orca.
 * Handles instruction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionInstructionService(...)
 * const result = await service.createOpenPositionInstructions({ bot, state, tickLower, tickUpper, amountA, amountB })
 */
@Injectable()
export class OpenPositionInstructionService {
    constructor(
    private readonly anchorUtilsService: AnchorUtilsService,
    private readonly ataInstructionService: AtaInstructionService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly tickArrayService: TickArrayService,
    private readonly positionService: PositionService,
    private readonly solanaKeypairService: SolanaKeypairService,
    ) {}

    async createOpenPositionInstructions({
        bot,
        liquidityPool,
        tickLower,
        tickUpper,
        liquidity,
        amountA,
        amountB,
    }: CreateOpenPositionInstructionsParams): Promise<CreateOpenPositionInstructionsResult> {
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        const mintKeyPair = await this.solanaKeypairService.generateKeypair()
        const tokenA = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokenMap.get(liquidityPool.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const { programAddress, tokenVault0, tokenVault1 } = liquidityPool.metadata as OrcaLiquidityPoolMetadata
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(liquidityPool.poolAddress),
            tickIndex: tickLower,
            tickSpacing: new BN(liquidityPool.clmmState.tickSpacing),
            programAddress: address(programAddress),
            bot,
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(liquidityPool.poolAddress),
            tickIndex: tickUpper,
            tickSpacing: new BN(liquidityPool.clmmState.tickSpacing),
            programAddress: address(programAddress),
            bot,
        })
        const {
            instructions: createAtaAInstructions,
            endInstructions: closeAtaAInstructions,
            ataAddress: ataAAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            amount: amountA,
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
            amount: amountB,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const { ataAddress } =
      await this.ataInstructionService.getOrCreateAtaInstructions({
          tokenMint: address(mintKeyPair.publicKey.toBase58()),
          ownerAddress: address(bot.accountAddress),
          is2022Token: true,
          pdaOnly: true,
      })
        const { pda: positionPda } = await this.positionService.getPda({
            nftMintAddress: address(mintKeyPair.publicKey.toBase58()),
            programAddress: address(programAddress),
        })

        const [openPositionArgs] =
      OpenPositionWithTokenMetadataExtensionArgs.serialize({
          tickLowerIndex: tickLower.toNumber(),
          tickUpperIndex: tickUpper.toNumber(),
          withTokenMetadataExtension: true,
      })
        const openPositionInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                // funder
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // owner
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // position
                {
                    address: address(positionPda),
                    role: AccountRole.WRITABLE,
                },
                // mint
                {
                    address: address(mintKeyPair.publicKey.toBase58()),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // position token account
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                // state
                {
                    address: address(liquidityPool.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                // token program
                {
                    address: TOKEN_2022_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // system program
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // ata program
                {
                    address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // metadata update auth
                {
                    address: address(METADATA_UPDATE_AUTH_ADDRESS),
                    role: AccountRole.READONLY,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                {
                    ixName: "open_position_with_token_extensions",
                    data: openPositionArgs,
                }
            ),
        }
        instructions.push(openPositionInstruction)
        const [increaseLiquidityArgs] = IncreaseLiquidityArgs.serialize({
            liquidityAmount: liquidity.toString(),
            tokenMaxA: amountA.toString(),
            tokenMaxB: amountB.toString(),
        })
        const increaseLiquidityInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(liquidityPool.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: positionPda,
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(ataAddress),
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
                {
                    ixName: "increase_liquidity",
                    data: increaseLiquidityArgs,
                }
            ),
        }
        instructions.push(increaseLiquidityInstruction)
        instructions.push(...endInstructions)
        return {
            mintKeyPair,
            ataAddress,
            personalPosition: positionPda,
            instructions,
        }
    }
}


export const OpenPositionWithTokenMetadataExtensionArgs = new BeetArgsStruct(
    [
        ["tickLowerIndex",
            i32],
        ["tickUpperIndex",
            i32],
        ["withTokenMetadataExtension",
            bool],
    ],
    "OpenPositionWithTokenMetadataExtensionArgs",
)

export const IncreaseLiquidityArgs = new BeetArgsStruct(
    [
        ["liquidityAmount",
            u128],
        ["tokenMaxA",
            u64],
        ["tokenMaxB",
            u64],
    ],
    "IncreaseLiquidityArgs",
)