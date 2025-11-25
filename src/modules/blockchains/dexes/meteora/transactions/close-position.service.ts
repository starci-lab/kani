import { Injectable } from "@nestjs/common"
import {
    Instruction,
} from "@solana/kit"
import { AnchorUtilsService, AtaInstructionService } from "../../../tx-builder"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../../../interfaces"
import { u128, u64, BeetArgsStruct } from "@metaplex-foundation/beet"

export interface CreateCloseInstructionsParams {
    bot: BotSchema
    state: LiquidityPoolState
    clientIndex?: number
}

@Injectable()
export class ClosePositionInstructionService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }
    /**
   * Build & append decrease_liquidity_v2 (close position) instruction
   */
    async createCloseInstructions({
        bot,
        state,
        clientIndex = 0,
    }: CreateCloseInstructionsParams)
    : Promise<Array<Instruction>>
    {
        return []
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