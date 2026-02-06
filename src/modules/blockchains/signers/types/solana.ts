import {
    BotSchema 
} from "@modules/databases"
import {
    KeyPairSigner 
} from "@solana/kit"

/**
 * Parameters for executing an action with a Solana signer.
 */
export interface WithSolanaSignerParams<TResponse = void> {
    /** Bot schema containing encrypted private key. */
    bot: BotSchema
    /** Action to execute with the Solana signer. */
    action: (signer: KeyPairSigner) => Promise<TResponse>
}
