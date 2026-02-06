import {
    Injectable
} from "@nestjs/common"
import BN from "bn.js"
import {
    sha256
} from "@noble/hashes/sha2"
import {
    Instruction,
    appendTransactionMessageInstructions,
} from "@solana/kit"
import {
    AppendIxParams,
    AppendIxResult,
    EncodeAnchorIxParams,
    EncodeAnchorIxResult
} from "../types"

/**
 * Service for Anchor instruction discriminators, number serialization, and appending instructions.
 *
 * @example
 * const disc = anchorUtilsService.anchorDiscriminator("initialize")
 * anchorUtilsService.appendIx({ tx, programAddress, accounts, data })
 */
@Injectable()
export class AnchorUtilsService {
    /**
     * Computes the 8-byte Anchor instruction discriminator for an instruction name.
     *
     * @param instructionName - Anchor instruction name (e.g. "initialize")
     * @returns First 8 bytes of SHA256("global:" + instructionName)
     */
    anchorDiscriminator(instructionName: string): Uint8Array {
        const preimage = `global:${instructionName}`
        const hash = sha256(new TextEncoder().encode(preimage))
        return hash.slice(0,
            8)
    }

    /**
     * Serializes a number as 8-byte little-endian unsigned.
     *
     * @param n - Value (BN, number, or string)
     * @returns 8-byte LE encoding
     */
    u64LE(n: BN | number | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toArrayLike(Buffer,
            "le",
            8)
    }

    /**
     * Serializes a number as 16-byte little-endian unsigned.
     *
     * @param n - Value (BN, number, or string)
     * @returns 16-byte LE encoding
     */
    u128LE(n: BN | number | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toArrayLike(Buffer,
            "le",
            16)
    }

    /**
     * Serializes a number as 4-byte little-endian signed (two's complement).
     *
     * @param n - Value (number, BN, or string)
     * @returns 4-byte LE encoding
     */
    i32LE(n: number | BN | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toTwos(32).toArrayLike(Buffer,
            "le",
            4)
    }

    /**
     * Serializes a boolean as a single byte (0 or 1).
     *
     * @param n - Boolean value
     * @returns 1-byte encoding
     */
    bool(n: boolean): Uint8Array {
        return Uint8Array.from([n ? 1 : 0])
    }

    /**
     * Encodes an Anchor instruction: discriminator bytes followed by optional data.
     *
     * @param param - Instruction name and optional serialized data
     * @returns Combined discriminator + data bytes
     *
     * @example
     * const data = anchorUtilsService.encodeAnchorIx({ ixName: "initialize", data: payload })
     */
    encodeAnchorIx({ ixName, data }: EncodeAnchorIxParams): EncodeAnchorIxResult {
        const disc = this.anchorDiscriminator(ixName)
        const totalLength = data ? data.length + disc.length : disc.length
        const out = new Uint8Array(totalLength)
        out.set(disc)
        if (data) {
            out.set(data,
                disc.length)
        }
        return out
    }

    /**
     * Appends one instruction to a transaction message.
     *
     * @param param - Transaction, program address, accounts, and instruction data
     * @returns The same transaction message (mutated)
     *
     * @example
     * const tx = anchorUtilsService.appendIx({ tx, programAddress, accounts, data })
     */
    appendIx({
        tx,
        programAddress,
        accounts,
        data,
    }: AppendIxParams): AppendIxResult {
        const ix: Instruction = {
            programAddress,
            accounts,
            data,
        }
        appendTransactionMessageInstructions([ix],
            tx)
        return tx
    }
}
