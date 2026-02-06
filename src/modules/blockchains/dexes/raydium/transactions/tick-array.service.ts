import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    getProgramDerivedAddress, getAddressEncoder, address 
} from "@solana/kit"
import {
    GetTickArrayPdaByStartIndexParams,
    GetTickArrayPdaParams,
    GetTickArrayPdaResult
} from "../types"

export const TICK_ARRAY_SIZE = 60

/**
 * Service responsible for deriving tick array PDAs for Raydium.
 * Handles program derived address generation for tick arrays.
 *
 * @example
 * const service = new TickArrayService()
 * const result = await service.getPda({ poolStateAddress, tickIndex, tickSpacing, programAddress })
 */
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
    }: GetTickArrayPdaByStartIndexParams): Promise<GetTickArrayPdaResult> {

        const [pda] = await getProgramDerivedAddress({
            programAddress,
            seeds: [
                Buffer.from("tick_array"),
                getAddressEncoder().encode(address(poolStateAddress)),
                new BN(startIndex).toTwos(32).toArrayLike(Buffer,
                    "be",
                    4),
            ],
        })

        return {
            pda 
        }
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
    getArrayStartIndex(tickIndex: BN, tickSpacing: BN): BN {
        const ticksPerArray = tickSpacing.mul(new BN(TICK_ARRAY_SIZE))

        let start = tickIndex.div(ticksPerArray)

        // Adjust for negative division like on-chain
        if (tickIndex.lt(new BN(0)) && !tickIndex.mod(ticksPerArray).eq(new BN(0))) {
            start = start.sub(new BN(1))
        }

        return start.mul(ticksPerArray)
    }

    /**
     * Validate whether the startIndex aligns with the TickArray boundaries.
     * Valid if: startIndex % (tickSpacing * 60) === 0
     */
    checkIsValidStartIndex(startIndex: BN, tickSpacing: BN): boolean {
        const ticksPerArray = tickSpacing.mul(new BN(TICK_ARRAY_SIZE))
        return startIndex.mod(ticksPerArray).eq(new BN(0))
    }

    /**
     * Compute the offset of a tick inside a TickArray.
     *
     * Equivalent to on-chain:
     *   get_tick_offset_in_array()
     */
    getTickOffsetInArray(
        tickIndex: BN,
        startIndex: BN,
        tickSpacing: BN,
    ): BN {
        if (!tickIndex.sub(startIndex).mod(tickSpacing).eq(new BN(0))) {
            throw new Error("tickIndex does not align with tickSpacing")
        }

        const offset = tickIndex.sub(startIndex).div(tickSpacing)

        if (offset.lt(new BN(0)) || offset.gte(new BN(TICK_ARRAY_SIZE))) {
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
    }: GetTickArrayPdaParams): Promise<GetTickArrayPdaResult> {
        const startIndex = this.getArrayStartIndex(tickIndex,
            tickSpacing)
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
    getTickArrayStartIndexFromTick(tickIndex: BN, tickSpacing: BN): BN {
        return this.getArrayStartIndex(new BN(tickIndex),
            tickSpacing)
    }
}
