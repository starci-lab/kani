import { Injectable } from "@nestjs/common"
import {
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import { AtaInstructionService, AnchorUtilsService, KeypairGeneratorsService } from "../../../tx-builder"
import { BotSchema, MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { i32, BeetArgsStruct  } from "@metaplex-foundation/beet"
import { buildLiquidityStrategyParameters, DEFAULT_BIN_PER_POSITION, getBinCount, getLiquidityStrategyParameterBuilder, getPositionCountByBinCount, MAX_BINS_PER_POSITION, StrategyType } from "@meteora-ag/dlmm"
import { DlmmLiquidityPoolState } from "../../../interfaces"
import Decimal from "decimal.js"
import BN from "bn.js"
import { InvalidPoolTokensException } from "@exceptions"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { SYSVAR_RENT_ADDRESS } from "@solana/sysvars"
import { EventAuthorityService } from "./event-authority.service"
import { KeyPairSigner } from "@solana/signers"
 
export interface CreateOpenPositionInstructionsParams {
    bot: BotSchema
    state: DlmmLiquidityPoolState
    amountA: BN
    amountB: BN
    clientIndex?: number
}

export interface CreateOpenPositionInstructionsResponse {
    instructions: Array<Instruction>
    positionKeyPairs: Array<KeyPairSigner>
}

@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly eventAuthorityService: EventAuthorityService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly keypairGeneratorsService: KeypairGeneratorsService,
        private readonly anchorUtilsService: AnchorUtilsService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createOpenPositionInstructions({
        bot,
        state,
        amountA,
        amountB,
        clientIndex = 0,
    }: CreateOpenPositionInstructionsParams)
    : Promise<CreateOpenPositionInstructionsResponse>
    {
        const metadata = state.static.metadata as MeteoraLiquidityPoolMetadata
        const tokenA = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Invalid pool tokens")
        }
        const instructions: Array<Instruction> = []
        const endInstructions: Array<Instruction> = []
        const minBinId = new Decimal(state.dynamic.activeId).sub(state.static.binOffset)
        const maxBinId = new Decimal(state.dynamic.activeId).add(state.static.binOffset)
        const binCount = getBinCount(minBinId.toNumber(), maxBinId.toNumber())
        const positionCount = getPositionCountByBinCount(binCount)
        const positionKeyPairs = await this.keypairGeneratorsService.generateKeypairs(positionCount)
        const liquidityStrategyParameters = buildLiquidityStrategyParameters(
            amountA,
            amountB,
            new BN(minBinId.sub(new Decimal(state.dynamic.activeId)).toNumber()),
            new BN(maxBinId.sub(new Decimal(state.dynamic.activeId)).toNumber()),
            new BN(state.static.binStep),
            false,
            new BN(state.dynamic.activeId),
            getLiquidityStrategyParameterBuilder(StrategyType.Curve)
        )
        let startBinId = minBinId
        for (const positionKeyPair of positionKeyPairs) {
            const liquidityStrategyParameters = buildLiquidityStrategyParameters(
                amountA,
                amountB,
                new BN(startBinId.sub(new Decimal(state.dynamic.activeId)).toNumber()),
                new BN(startBinId.add(new Decimal(state.static.binStep)).sub(new Decimal(state.dynamic.activeId)).toNumber()),
                new BN(state.static.binStep),
                false,
                new BN(state.dynamic.activeId),
                getLiquidityStrategyParameterBuilder(StrategyType.Curve)
            )
            startBinId = startBinId.add(new Decimal(state.static.binStep))
            const {
                instructions: createAtaAInstructions,
                endInstructions: closeAtaAInstructions,
                ataAddress: ataAAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
                ownerAddress: address(bot.accountAddress),
                is2022Token: tokenA.is2022Token,
                clientIndex,
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
                clientIndex,
                amount: amountB,
            })
            if (createAtaBInstructions?.length) {
                instructions.push(...createAtaBInstructions)
            }
            if (closeAtaBInstructions?.length) {
                endInstructions.push(...closeAtaBInstructions)
            }
            const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
                programAddress: address(metadata.programAddress),
            })
            for (const positionKeyPair of positionKeyPairs) {
                const endBinId = Decimal.min(
                    startBinId.add(new Decimal(MAX_BINS_PER_POSITION.toNumber())).sub(new Decimal(state.dynamic.activeId)),
                    maxBinId
                )
                const binCount = getBinCount(startBinId.toNumber(), endBinId.toNumber())
                const positionWidth = Math.min(
                    binCount,
                    DEFAULT_BIN_PER_POSITION.toNumber()
                )
                console.log("eventAuthorityPda", eventAuthorityPda)
                const [
                    openPositionArgs
                ] = OpenPositionArgs.serialize({
                    lowerBinId: startBinId.toNumber(),
                    width: positionWidth,
                })
                const initializePositionInstruction: Instruction = {
                    programAddress: address(metadata.programAddress),
                    accounts: [
                        // payer
                        {
                            address: address(bot.accountAddress),
                            role: AccountRole.WRITABLE_SIGNER,
                        },
                        // position owner
                        {
                            address: address(positionKeyPair.address),
                            role: AccountRole.WRITABLE_SIGNER,
                        },
                        // pool address
                        {
                            address: address(state.static.poolAddress),
                            role: AccountRole.WRITABLE,
                        },
                        // owner
                        {
                            address: address(bot.accountAddress),
                            role: AccountRole.WRITABLE,
                        },
                        // system program
                        {
                            address: SYSTEM_PROGRAM_ADDRESS,
                            role: AccountRole.READONLY,
                        },
                        // rent 
                        {
                            address: SYSVAR_RENT_ADDRESS,
                            role: AccountRole.READONLY,
                        },
                        // event authority
                        {
                            address: address(eventAuthorityPda),
                            role: AccountRole.READONLY,
                        },
                        // dlmm metadata program
                        {
                            address: address(metadata.programAddress),
                            role: AccountRole.READONLY,
                        },
                    ],
                    data: this.anchorUtilsService.encodeAnchorIx(
                        "initialize_position",
                        openPositionArgs
                    ),  
                }
                instructions.push(initializePositionInstruction)
            }
        }   
        return {
            instructions,
            positionKeyPairs,
        }
    }
}
export const OpenPositionArgs = new BeetArgsStruct(
    [
        ["lowerBinId", i32],
        ["width", i32],
    ],
    "OpenPositionArgs"
)
