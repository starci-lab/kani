import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { getProgramDerivedAddress, getAddressEncoder, Address, address } from "@solana/kit"

export const TICK_ARRAY_SIZE = 60

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
    getArrayStartIndex(tickIndex: number, tickSpacing: number): number {
        const ticksPerArray = TICK_ARRAY_SIZE * tickSpacing

        let start = Math.trunc(tickIndex / ticksPerArray)

        // Adjust for negative division like on-chain
        if (tickIndex < 0 && tickIndex % ticksPerArray !== 0) {
            start -= 1
        }

        return start * ticksPerArray
    }

    /**
     * Validate whether the startIndex aligns with the TickArray boundaries.
     * Valid if: startIndex % (tickSpacing * 60) === 0
     */
    checkIsValidStartIndex(startIndex: number, tickSpacing: number): boolean {
        const ticksPerArray = TICK_ARRAY_SIZE * tickSpacing
        return startIndex % ticksPerArray === 0
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

        const offset = (tickIndex - startIndex) / tickSpacing

        if (offset < 0 || offset >= TICK_ARRAY_SIZE) {
            throw new Error("Tick is not inside this TickArray")
        }

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
        const startIndex = this.getArrayStartIndex(tickIndex, tickSpacing)
        return this.getTickArrayPda({
            poolStateAddress,
            startIndex,
            programAddress,
        })
    }

    /**
     * Move left or right to the next TickArray.
     * Matches the on-chain logic used in swaps.
     */
    nextTickArrayStartIndex(
        currentStart: number,
        tickSpacing: number,
        zeroForOne: boolean,
    ): number {
        const ticksPerArray = TICK_ARRAY_SIZE * tickSpacing
        return zeroForOne
            ? currentStart - ticksPerArray
            : currentStart + ticksPerArray
    }

    /**
     * Convenience helper that returns startIndex for any tickIndex.
     */
    getTickArrayStartIndexFromTick(tickIndex: number, tickSpacing: number): number {
        return this.getArrayStartIndex(tickIndex, tickSpacing)
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