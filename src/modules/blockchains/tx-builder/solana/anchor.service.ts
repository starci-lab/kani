// libs/anchor-utils/src/anchor-utils.service.ts
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { sha256 } from "@noble/hashes/sha2"
import { 
    TransactionMessage, 
    Instruction, 
    AccountRole, 
    Address, 
    appendTransactionMessageInstructions,
} from "@solana/kit"

@Injectable()
export class AnchorUtilsService {
    /* ----------------------------------------
   *  DISCRIMINATOR
   * ---------------------------------------- */
    anchorDiscriminator(instructionName: string): Uint8Array {
        const preimage = `global:${instructionName}`
        const hash = sha256(new TextEncoder().encode(preimage))
        return hash.slice(0, 8)
    }

    /* ----------------------------------------
   *  NUMBER SERIALIZATION
   * ---------------------------------------- */
    u64LE(n: BN | number | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toArrayLike(Buffer, "le", 8)
    }

    u128LE(n: BN | number | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toArrayLike(Buffer, "le", 16)
    }

    i32LE(n: number | BN | string): Uint8Array {
        const bn = BN.isBN(n) ? n : new BN(n)
        return bn.toTwos(32).toArrayLike(Buffer, "le", 4)
    }
    bool(n: boolean): Uint8Array {
        return Uint8Array.from([n ? 1 : 0])
    }

    /* ----------------------------------------
   *  ENCODE ANCHOR INSTRUCTION
   * ---------------------------------------- */
    encodeAnchorIx(
        ixName: string, 
        data?: Uint8Array
    ): Uint8Array {
        const disc = this.anchorDiscriminator(ixName)
        const totalLength = data ? data.length + disc.length : disc.length
        const out = new Uint8Array(totalLength)
        out.set(disc)
        if (data) {
            out.set(data, disc.length)
        }
        return out
    }
    
    /* ----------------------------------------
   *  APPEND TO TransactionMessage
   * ---------------------------------------- */
    appendIx(
        tx: TransactionMessage,
        programAddress: Address,
        accounts: Array<{ address: Address; role: AccountRole }>,
        data: Uint8Array,
    ) {
        const ix: Instruction = {
            programAddress,
            accounts,
            data,
        }
        appendTransactionMessageInstructions([ix], tx)
        return tx
    }
}