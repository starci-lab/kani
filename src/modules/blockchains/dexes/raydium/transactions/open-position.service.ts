
import {
    Injectable 
} from "@nestjs/common"
import {
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import {
    SYSTEM_PROGRAM_ADDRESS 
} from "@solana-program/system"
import { 
    TOKEN_2022_PROGRAM_ADDRESS, 
    ASSOCIATED_TOKEN_PROGRAM_ADDRESS, 
} from "@solana-program/token-2022" 
import {
    AnchorUtilsService, AtaInstructionService, WSOL_MINT_ADDRESS 
} from "../../../tx-builder"
import {
    PrimaryMemoryStorageService, RaydiumLiquidityPoolMetadata 
} from "@modules/databases"
import {
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException
} from "@modules/exceptions"
import {
    TickArrayService 
} from "./tick-array.service"
import {
    PersonalPositionService 
} from "./personal-position.service"
import {
    SYSVAR_RENT_ADDRESS     
} from "@solana/sysvars"
import {
    TOKEN_PROGRAM_ADDRESS
} from "@solana-program/token"
import BN from "bn.js"
import {
    u128, u64, i32, bool, BeetArgsStruct, u8  
} from "@metaplex-foundation/beet"
import {
    CreateOpenPositionInstructionsParams,
    CreateOpenPositionInstructionsResult
} from "../types"
import {
    SolanaKeypairService
} from "../../../tx-builder"

/**
 * Service responsible for creating open position instructions for Raydium.
 * Handles instruction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionInstructionService(...)
 * const result = await service.createOpenPositionInstructions({ bot, state, liquidity, amountAMax, amountBMax, tickLower, tickUpper })
 */
@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickArrayService: TickArrayService,
        private readonly personalPositionService: PersonalPositionService,
        private readonly solanaKeypairService: SolanaKeypairService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createOpenPositionInstructions({
        bot,
        liquidity,
        amountAMax,
        amountBMax,
        tickLower,
        tickUpper,
        liquidityPool,
    }: CreateOpenPositionInstructionsParams)
    : Promise<CreateOpenPositionInstructionsResult>
    {
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
        const {
            programAddress,
            tokenVault0,
            tokenVault1,
        } = liquidityPool.metadata as RaydiumLiquidityPoolMetadata
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(liquidityPool.poolAddress),
            tickIndex: tickLower,
            tickSpacing: new BN(liquidityPool.clmmState.tickSpacing),
            programAddress: address(programAddress),
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(liquidityPool.poolAddress),
            tickIndex: tickUpper,
            tickSpacing: new BN(liquidityPool.clmmState.tickSpacing),
            programAddress: address(programAddress),
        })
        const {
            instructions: createAtaAInstructions,
            endInstructions: closeAtaAInstructions,
            ataAddress: ataAAddress,
        } = await this.ataInstructionService.createIdempotentAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            amount: amountAMax,
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
        } = await this.ataInstructionService.createIdempotentAtaInstructions({
            tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenB.is2022Token,
            amount: amountBMax,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const ataAddress = await this.ataInstructionService.getAta({
            tokenMint: address(mintKeyPair.publicKey.toBase58()),
            ownerAddress: address(bot.accountAddress),
            is2022Token: true,
        })
        const tickArrayLowerStartIndex = this.tickArrayService.getArrayStartIndex(
            tickLower, 
            new BN(liquidityPool.clmmState.tickSpacing)
        )
        const tickArrayUpperStartIndex = this.tickArrayService.getArrayStartIndex(
            tickUpper, 
            new BN(liquidityPool.clmmState.tickSpacing)
        )
        const {
            pda: personalPositionPda,
        } = await this.personalPositionService.getPda({
            nftMintAddress: address(mintKeyPair.publicKey.toBase58()),
            programAddress: address(programAddress),
        })
        const [
            openPositionArgs
        ] = OpenPositionArgs.serialize({
            liquidity,
            amount0Max: amountAMax.toString(),
            amount1Max: amountBMax.toString(),
            optionBaseFlag: 0,
            tickArrayLowerStartIndex: tickArrayLowerStartIndex,
            tickArrayUpperStartIndex: tickArrayUpperStartIndex,
            tickLowerIndex: tickLower.toNumber(),
            tickUpperIndex: tickUpper.toNumber(),
            withMetadata: false,
            baseFlag: false,
        })
        const openPositionWithToken22Instruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.READONLY,
                },
                {
                    address: address(mintKeyPair.publicKey.toBase58()),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                {
                    address: address(liquidityPool.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                // protocol_position (deprecated)
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
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
                    address: personalPositionPda,
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
                    address: SYSVAR_RENT_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: TOKEN_2022_PROGRAM_ADDRESS,
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
            ],
            data:
                this.anchorUtilsService.encodeAnchorIx(
                    {
                        ixName: "open_position_with_token22_nft",
                        data: openPositionArgs,
                    }
                ),
        }
        instructions.push(openPositionWithToken22Instruction)
        instructions.push(...endInstructions)
        return {
            instructions,
            positionKeyPair: mintKeyPair,
            ataAddress,
            personalPosition: personalPositionPda,
        }
    }
}


export const OpenPositionArgs = new BeetArgsStruct(
    [
        ["tickLowerIndex",
            i32],
        ["tickUpperIndex",
            i32],
        ["tickArrayLowerStartIndex",
            i32],
        ["tickArrayUpperStartIndex",
            i32],
        ["liquidity",
            u128],
        ["amount0Max",
            u64],
        ["amount1Max",
            u64],
        ["withMetadata",
            bool],
        ["optionBaseFlag",
            u8],
        ["baseFlag",
            bool],
    ],
    "OpenPositionArgs"
)
