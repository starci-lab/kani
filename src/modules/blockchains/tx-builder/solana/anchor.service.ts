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

    /* ----------------------------------------
   *  ENCODE ANCHOR INSTRUCTION
   * ---------------------------------------- */
    encodeAnchorIx(
        ixName: string, 
        components: Array<Uint8Array>
    ): Uint8Array {
        const disc = this.anchorDiscriminator(ixName)
        const totalLength =
      components.reduce((sum, c) => sum + c.length, disc.length)
        const out = new Uint8Array(totalLength)
        out.set(disc)
        let offset = disc.length
        for (const comp of components) {
            out.set(comp, offset)
            offset += comp.length
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