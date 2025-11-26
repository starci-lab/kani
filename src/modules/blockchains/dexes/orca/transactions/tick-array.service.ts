import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { getProgramDerivedAddress, getAddressEncoder, Address, address } from "@solana/kit"
import { Decimal } from "decimal.js"
import { getTickArrayStartTickIndex } from "@orca-so/whirlpools-core"

@Injectable()
export class TickArrayService {

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
                new BN(startIndex).toTwos(32).toArrayLike(Buffer, "be", 4),
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
    async getPda({
        poolStateAddress,
        tickIndex,
        tickSpacing,
        programAddress,
    }: GetTickArrayPdaParams): Promise<GetTickArrayPdaResponse> {
        const startIndex = getTickArrayStartTickIndex(tickIndex, tickSpacing)
        return this.getTickArrayPda({
            poolStateAddress,
            startIndex,
            programAddress,
        })
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
}

export interface GetTickArrayPdaResponse {
    pda: Address
}