import {
    BotSchema 
} from "@modules/databases"
import {
    Ed25519Keypair as SuiEd25519Keypair 
} from "@mysten/sui/keypairs/ed25519"

/**
 * Parameters for executing an action with a Sui signer.
 */
export interface WithSuiSignerParams<TResponse = void> {
    /** Bot schema containing encrypted private key. */
    bot: BotSchema
    /** Action to execute with the Sui signer. */
    action: (signer: SuiEd25519Keypair) => Promise<TResponse>
}
