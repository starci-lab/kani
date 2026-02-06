import {
    BotSchema 
} from "@modules/databases"
import {
    ethers 
} from "ethers"

/**
 * Parameters for executing an action with an EVM signer.
 */
export interface WithEvmSignerParams<TResponse = void> {
    /** Bot schema containing encrypted private key. */
    bot: BotSchema
    /** Action to execute with the EVM signer. */
    action: (signer: ethers.Wallet) => Promise<TResponse>
}
