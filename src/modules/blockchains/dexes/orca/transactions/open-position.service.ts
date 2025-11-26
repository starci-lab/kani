import { Injectable } from "@nestjs/common"
import { AnchorUtilsService, AtaInstructionService } from "../../../tx-builder"
import { BotSchema, OrcaLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { AccountRole, Address, address, generateKeyPairSigner, Instruction, KeyPairSigner } from "@solana/kit"
import { LiquidityPoolState } from "@modules/blockchains"
import { InvalidPoolTokensException } from "@exceptions"
import { TickArrayService } from "./tick-array.service"
import { Decimal } from "decimal.js"
import BN from "bn.js"
import { PositionService } from "./position.service"
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { BeetArgsStruct, bool, i32 } from "@metaplex-foundation/beet"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"

@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickArrayService: TickArrayService,
        private readonly positionService: PositionService,
    ) { }

    async createOpenPositionInstructions({
        bot,
        state,
        clientIndex = 0,
        tickLower,
        tickUpper,
        liquidity,
        amountAMax,
        amountBMax,
    }: CreateOpenPositionInstructionsParams
    )
    : Promise<CreateOpenPositionInstructionsResponse>
    {
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        const mintKeyPair = await generateKeyPairSigner()
        const tokenA = this.primaryMemoryStorageService
            .tokens.find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService
            .tokens.find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const {
            programAddress,
            tokenVault0,
            tokenVault1,
        } = state.static.metadata as OrcaLiquidityPoolMetadata
        const { pda: tickArrayLowerPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: tickLower.toNumber(),
            tickSpacing: state.static.tickSpacing,
            programAddress: address(programAddress),
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: tickUpper.toNumber(),
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
            clientIndex,
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
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenB.is2022Token,
            clientIndex,
            amount: amountBMax,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const {
            ataAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: mintKeyPair.address,
            ownerAddress: address(bot.accountAddress),
            is2022Token: true,
            clientIndex,
            pdaOnly: true,
        })
        const { pda: positionPda } = await this.positionService.getPda({
            nftMintAddress: mintKeyPair.address,
            programAddress: address(programAddress),
        })
        const [
            openPositionArgs
        ] = OpenPositionWithTokenMetadataExtensionArgs.serialize({
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
                    address: address(mintKeyPair.address),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // position token account
                {
                    address: address(ataAddress),
                    role: AccountRole.WRITABLE,
                },
                // state
                {
                    address: address(state.static.poolAddress),
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
                    address: address("3axbTs2z5GBy6usVbNVoqEgZMng3vZvMnAoX29BFfwhr"),
                    role: AccountRole.READONLY,
                }
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                "open_position_with_token_extensions", 
                openPositionArgs
            ),
        }
        instructions.push(openPositionInstruction)
        instructions.push(...endInstructions)
        return {
            mintKeyPair,
            ataAddress,
            instructions,
        }
    }
}

export interface CreateOpenPositionInstructionsParams {
    bot: BotSchema
    state: LiquidityPoolState
    clientIndex?: number
    tickLower: Decimal
    tickUpper: Decimal
    liquidity: BN
    amountAMax: BN
    amountBMax: BN
}

export interface CreateOpenPositionInstructionsResponse {
    instructions: Array<Instruction>
    mintKeyPair: KeyPairSigner
    ataAddress: Address
}

export const OpenPositionWithTokenMetadataExtensionArgs = new BeetArgsStruct(
    [
        ["tickLowerIndex", i32],
        ["tickUpperIndex", i32],
        ["withTokenMetadataExtension", bool]
    ],
    "OpenPositionWithTokenMetadataExtensionArgs"
)