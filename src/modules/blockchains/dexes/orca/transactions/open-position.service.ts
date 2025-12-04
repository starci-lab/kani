import { Injectable } from "@nestjs/common"
import { AnchorUtilsService, AtaInstructionService } from "../../../tx-builder"
import { BotSchema, OrcaLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { AccountRole, Address, address, createNoopSigner, generateKeyPairSigner, Instruction, KeyPairSigner } from "@solana/kit"
import { LiquidityPoolState } from "@modules/blockchains"
import { FeeToAddressNotFoundException, InvalidPoolTokensException } from "@exceptions"
import { TickArrayService } from "./tick-array.service"
import { Decimal } from "decimal.js"
import BN from "bn.js"
import { PositionService } from "./position.service"
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { getTransferSolInstruction, SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { BeetArgsStruct, bool, i32, u128, u64 } from "@metaplex-foundation/beet"
import { getTransferInstruction as getTransferInstruction2022, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { getTransferInstruction } from "@solana-program/token"
import { METADATA_UPDATE_AUTH_ADDRESS } from "./constants"
import { TokenType } from "@modules/common"
import { createSolanaRpc } from "@solana/kit"
import { FeeService } from "../../../math"
import { LoadBalancerService } from "@modules/mixin"
import { ORCA_BALANCER_NAME } from "../constants"

@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly loadBalancerService: LoadBalancerService,
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickArrayService: TickArrayService,
        private readonly positionService: PositionService,
        private readonly feeService: FeeService,
    ) { }

    async createOpenPositionInstructions({
        bot,
        state,
        tickLower,
        tickUpper,
        liquidity,
        amountAMax,
        amountBMax,
    }: CreateOpenPositionInstructionsParams
    )
    : Promise<CreateOpenPositionInstructionsResponse>
    {
        const url = this.loadBalancerService.balanceP2c(
            ORCA_BALANCER_NAME, 
            this.primaryMemoryStorageService.clientConfig.orcaClmmClientRpcs
        )
        const rpc = createSolanaRpc(url)
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
        const feeToAddress = this.primaryMemoryStorageService.feeConfig.feeInfo?.[bot.chainId]?.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException("Fee to address not found")
        }
        const {
            feeAmount: feeAmountA,
            remainingAmount: remainingAmountA,
        } = this.feeService.splitAmount({
            amount: amountAMax,
            chainId: bot.chainId,
        })
        const {
            feeAmount: feeAmountB,
            remainingAmount: remainingAmountB,
        } = this.feeService.splitAmount({
            amount: amountBMax,
            chainId: bot.chainId,
        })
        if (tokenA.type === TokenType.Native) {
            instructions.push(
                getTransferSolInstruction({
                    source: createNoopSigner(address(bot.accountAddress)),
                    destination: address(feeToAddress),
                    amount: BigInt(feeAmountA.toString()),
                }))
        }
        if (tokenB.type === TokenType.Native) {
            instructions.push(
                getTransferSolInstruction({
                    source: createNoopSigner(address(bot.accountAddress)),
                    destination: address(feeToAddress),
                    amount: BigInt(feeAmountB.toString()),
                }))
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
            rpc,
            bot,
        })
        const { pda: tickArrayUpperPda } = await this.tickArrayService.getPda({
            poolStateAddress: address(state.static.poolAddress),
            tickIndex: tickUpper.toNumber(),
            tickSpacing: state.static.tickSpacing,
            programAddress: address(programAddress),
            rpc,
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
            url,
            amount: remainingAmountA,
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
            amount: remainingAmountB,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const getTransferAInstruction = tokenA.is2022Token ? getTransferInstruction2022 : getTransferInstruction    
        const getTransferBInstruction = tokenB.is2022Token ? getTransferInstruction2022 : getTransferInstruction
        if (tokenA.type !== TokenType.Native) {
            const {
                instructions: createAtaAInstructions,
                ataAddress: feeToAAtaAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                ownerAddress: address(bot.accountAddress),
                tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
                is2022Token: tokenA.is2022Token,
                url,
                amount: feeAmountA,
            })
            if (createAtaAInstructions?.length) {
                instructions.push(...createAtaAInstructions)
            }
            instructions.push(
                getTransferAInstruction({
                    source: ataAAddress,
                    destination: feeToAAtaAddress,
                    amount: BigInt(feeAmountA.toString()),
                    authority: address(bot.accountAddress),
                }))
        }
        if (tokenB.type !== TokenType.Native) {
            const {
                instructions: createAtaBInstructions,
                ataAddress: feeToBAtaAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                ownerAddress: address(bot.accountAddress),
                tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
                is2022Token: tokenB.is2022Token,
                url,
                amount: feeAmountB,
            })
            if (createAtaBInstructions?.length) {
                instructions.push(...createAtaBInstructions)
            }
            instructions.push(
                getTransferBInstruction({
                    source: ataBAddress,
                    destination: feeToBAtaAddress,
                    amount: BigInt(feeAmountB.toString()),
                    authority: address(bot.accountAddress),
                }))
        }
        const {
            ataAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: mintKeyPair.address,
            ownerAddress: address(bot.accountAddress),
            is2022Token: true,
            url,
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
                    address: address(METADATA_UPDATE_AUTH_ADDRESS),
                    role: AccountRole.READONLY,
                }
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                "open_position_with_token_extensions", 
                openPositionArgs
            ),
        }
        instructions.push(openPositionInstruction)
        const [
            increaseLiquidityArgs
        ] = IncreaseLiquidityArgs.serialize({
            liquidityAmount: liquidity.toString(),
            tokenMaxA: amountAMax.toString(),
            tokenMaxB: amountBMax.toString(),
        })
        const increaseLiquidityInstruction: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                {
                    address: address(state.static.poolAddress),
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
                }
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                "increase_liquidity",
                increaseLiquidityArgs
            ),
        }
        instructions.push(increaseLiquidityInstruction)
        instructions.push(...endInstructions)
        return {
            mintKeyPair,
            ataAddress,
            instructions,
            feeAmountA: amountAMax,
            feeAmountB: amountBMax,
        }
    }
}

export interface CreateOpenPositionInstructionsParams {
    bot: BotSchema
    state: LiquidityPoolState
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
    feeAmountA: BN
    feeAmountB: BN
}

export const OpenPositionWithTokenMetadataExtensionArgs = new BeetArgsStruct(
    [
        ["tickLowerIndex", i32],
        ["tickUpperIndex", i32],
        ["withTokenMetadataExtension", bool]
    ],
    "OpenPositionWithTokenMetadataExtensionArgs"
)

export const IncreaseLiquidityArgs = new BeetArgsStruct(
    [
        ["liquidityAmount", u128],
        ["tokenMaxA", u64],
        ["tokenMaxB", u64],
    ],
    "IncreaseLiquidityArgs"
)