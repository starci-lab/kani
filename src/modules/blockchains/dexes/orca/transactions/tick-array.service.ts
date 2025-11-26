import { Injectable } from "@nestjs/common"
import { getProgramDerivedAddress, getAddressEncoder, Address, address, fetchEncodedAccount, Rpc, SolanaRpcApi, Instruction, AccountRole } from "@solana/kit"
import { Decimal } from "decimal.js"
import { getTickArrayStartTickIndex } from "@orca-so/whirlpools-core"
import { BotSchema } from "@modules/databases"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { BeetArgsStruct, i32 } from "@metaplex-foundation/beet"
import { AnchorUtilsService } from "../../../tx-builder"
import { BotMissingParametersException, RpcMissingParametersException } from "@exceptions"

@Injectable()
export class TickArrayService {
    constructor(
        private readonly anchorUtilsService: AnchorUtilsService,
    ) { }
    /**
     * Internal helper that derives a TickArray PDA directly from:
     *   ["tick_array", pool_id, start_index_be_bytes]
     *
     * This matches the on-chain Raydium implementation:
     *    TickArrayState::key()
     */
    private async getTickArrayPda({
        poolStateAddress,
        startIndex,
        programAddress,
    }: GetTickArrayPdaByStartIndexParams): Promise<GetTickArrayPdaResponse> {
        
        const [pda] = await getProgramDerivedAddress({
            programAddress,
            seeds: [
                Buffer.from("tick_array"),
                getAddressEncoder().encode(address(poolStateAddress)),
                `${startIndex}`,
            ],
        })
        return { pda }
    }

    /**
     * Compute the starting tick index for a TickArray.
     *
     * This is a TypeScript translation of the on-chain formula:
     *
     *   ticks_per_array = 60 * tick_spacing
     *   start = tick_index / ticks_per_array
     *   if tick_index < 0 and tick_index % ticks_per_array != 0:
     *       start -= 1
     *
     *   return start * ticks_per_array
     *
     * This matches Raydium’s negative index behavior.
     */
    getInitializableTickIndex(
        tickIndex: Decimal,
        tickSpacing: Decimal,
    ): Decimal {
        return tickIndex.sub(tickIndex.mod(tickSpacing))
    }

    /**
     * Compute the offset of a tick inside a TickArray.
     *
     * Equivalent to on-chain:
     *   get_tick_offset_in_array()
     */
    getTickOffsetInArray(
        tickIndex: number,
        startIndex: number,
        tickSpacing: number,
    ): number {
        if ((tickIndex - startIndex) % tickSpacing !== 0) {
            throw new Error("tickIndex does not align with tickSpacing")
        }
        const offset = new Decimal(tickIndex)
            .sub(new Decimal(startIndex))
            .div(new Decimal(tickSpacing))
            .toNumber()
        return offset
    }

    /**
     * Public API: Derive TickArray PDA from a raw tickIndex.
     *
     * This matches the Raydium SDK:
     *   TickUtils.getTickArrayAddressByTick()
     */
    async getPda(
        { 
            poolStateAddress, 
            tickIndex,
            tickSpacing,
            programAddress,
            rpc, 
            bot,
            pdaOnly
        }: GetTickArrayPdaParams
    ): Promise<GetTickArrayPdaResponse> {
        const startIndex = getTickArrayStartTickIndex(tickIndex, tickSpacing)
        const { pda } = await this.getTickArrayPda({
            poolStateAddress,
            startIndex,
            programAddress,
        })
        if (pdaOnly) {
            return { pda }
        }
        const [
            initializeTickArrayArgs
        ] = InitializeTickArrayArgs.serialize({
            startTickIndex: startIndex,
        })

        if (!rpc) {
            throw new RpcMissingParametersException("Rpc is required")
        }
        if (!bot) {
            throw new BotMissingParametersException("Bot is required")
        }
        const account = await fetchEncodedAccount(rpc, pda)
        if (account.exists) {
            const instructions: Array<Instruction> = []
            const initializeTickArrayInstruction: Instruction = {
                programAddress: address(programAddress),
                accounts: [
                    {
                        address: address(poolStateAddress),
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: address(bot.accountAddress),
                        role: AccountRole.WRITABLE_SIGNER,
                    },
                    {
                        address: pda,
                        role: AccountRole.WRITABLE,
                    },
                    {
                        address: SYSTEM_PROGRAM_ADDRESS,
                        role: AccountRole.READONLY,
                    },
                ],
                data: this.anchorUtilsService.encodeAnchorIx(
                    "initialize_tick_array", 
                    initializeTickArrayArgs
                ),
            }
            instructions.push(initializeTickArrayInstruction)
            return { pda, instructions }
        }
        return { pda }
    }
}

/* ---------------------------------------
 * Interfaces
 * -------------------------------------- */

/**
 * Used internally for deriving PDA from startIndex.
 */
export interface GetTickArrayPdaByStartIndexParams {
    poolStateAddress: Address
    startIndex: number
    programAddress: Address
}

/**
 * Public API: derive PDA using tickIndex.
 */
export interface GetTickArrayPdaParams {
    poolStateAddress: Address
    tickIndex: number
    tickSpacing: number
    programAddress: Address
    rpc?: Rpc<SolanaRpcApi>
    bot?: BotSchema
    pdaOnly?: boolean
}

export interface GetTickArrayPdaResponse {
    pda: Address
    instructions?: Array<Instruction>
}

export const InitializeTickArrayArgs = new BeetArgsStruct(
    [
        ["startTickIndex", i32],
    ],
    "InitializeTickArrayArgs"
)