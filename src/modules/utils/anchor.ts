// anchor-utils.ts
import { sha256 } from "@noble/hashes/sha2"
import { AccountMeta as SolanaWeb3JsAccountMeta } from "@solana/web3.js"
import { AccountMeta, AccountRole, Address, address } from "@solana/kit"
import { TransactionMessage } from "@solana/kit"
import BN from "bn.js"

/* ------------------------------------------
 *  ANCHOR DISCRIMINATOR
 * ------------------------------------------ */
export const anchorDiscriminator = (instructionName: string): Uint8Array => {
    const preimage = `global:${instructionName}`
    const hash = sha256(new TextEncoder().encode(preimage))
    return hash.slice(0, 8) // 8-byte discriminator
}

/* ------------------------------------------
 *  NUMBER SERIALIZATION (Anchor / Borsh)
 * ------------------------------------------ */
export const u64LE = (n: BN | number | string): Uint8Array => {
    const bn = BN.isBN(n) ? n : new BN(n)
    return bn.toArrayLike(Buffer, "le", 8)
}

export const u128LE = (n: BN | number | string): Uint8Array => {
    const bn = BN.isBN(n) ? n : new BN(n)
    return bn.toArrayLike(Buffer, "le", 16)
}

/* ------------------------------------------
 *  GENERIC ANCHOR INSTRUCTION ENCODER
 *  Example:
 *     encodeAnchorIx("transfer", [u64LE(amount)])
 * ------------------------------------------ */
export const encodeAnchorIx = (
    ixName: string,
    components: Array<Uint8Array>
): Uint8Array => {
    const disc = anchorDiscriminator(ixName)

    let totalLength = disc.length
    for (const comp of components) totalLength += comp.length

    const out = new Uint8Array(totalLength)
    out.set(disc, 0)

    let offset = disc.length
    for (const comp of components) {
        out.set(comp, offset)
        offset += comp.length
    }

    return out
}

export interface AppendTransactionMessageInstructionParams<Accounts, Data> {
    tx: TransactionMessage;
    programAddress: Address;
    ownerAddress: Address;
    accounts: Accounts;
    data: Data;
}

export const convertWeb3MetaToKitMeta = (meta: SolanaWeb3JsAccountMeta): AccountMeta => {
    const pubkey = address(meta.pubkey.toString())
    let role: AccountRole = AccountRole.READONLY
    if (meta.isWritable && meta.isSigner) {
        role = AccountRole.READONLY
    }
    if (meta.isSigner && !meta.isWritable) {
        role = AccountRole.READONLY_SIGNER
    }
    if (meta.isWritable && !meta.isSigner) {
        role = AccountRole.WRITABLE
    }
    if (!meta.isWritable && !meta.isSigner) {
        role = AccountRole.WRITABLE_SIGNER
    }
    return {
        address: pubkey,
        role,
    }
}