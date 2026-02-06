import type {
    ChainId
} from "@modules/typedefs"
import type {
    KeyQuorum,
    P256KeyPair
} from "@privy-io/node"

/** Result of createSigner. */
export interface PrivySignerResult {
    keyQuorum: KeyQuorum
    keyPair: P256KeyPair
}

/** Params for creating a wallet. */
export interface CreateWalletParams {
    policyIds?: Array<string>
    chainId: ChainId
    additionalSigners: Array<AdditionalSigner>
    userId?: string
}

/** Additional signer for wallet create. */
export interface AdditionalSigner {
    signerId: string
    policyIds?: Array<string>
}
