import { Injectable } from "@nestjs/common"
import {
    AccountRole,
    Instruction,
    address,
} from "@solana/kit"
import { AnchorUtilsService, AtaInstructionService } from "../../../tx-builder"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../../../interfaces"

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
        const close2Instruction: Instruction = {
            programAddress: address(state.static.poolAddress),
            accounts: [
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
            ],
        }
        return []
    }
}