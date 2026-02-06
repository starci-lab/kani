import type {
    AccountRole, Address, TransactionMessage 
} from "@solana/kit"

/** Params for encoding an Anchor instruction (discriminator + optional data). */
export interface EncodeAnchorIxParams {
    ixName: string
    data?: Uint8Array
}

/** Result of encode Anchor instruction: serialized instruction bytes. */
export type EncodeAnchorIxResult = Uint8Array

/** Account entry for append instruction (address and role). */
export interface AppendIxAccountEntry {
    address: Address
    role: AccountRole
}

/** Params for appending an instruction to a transaction message. */
export interface AppendIxParams {
    tx: TransactionMessage
    programAddress: Address
    accounts: Array<AppendIxAccountEntry>
    data: Uint8Array
}

/** Result of append instruction: the same transaction message (mutated). */
export type AppendIxResult = TransactionMessage
