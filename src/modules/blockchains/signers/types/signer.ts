import {
    BotSchema 
} from "@modules/databases"
import {
    PlatformId 
} from "../../enums"
/**
 * Parameters for executing an action with a signer.
 */
export interface WithSignerParams<TSigner, TResponse = void> {
    /** Bot schema containing encrypted private key. */
    bot: BotSchema
    /** Platform identifier. */
    platformId: PlatformId
    /** Action to execute with the signer. */
    action: (signer: TSigner) => Promise<TResponse>
    /** Factory function to create signer from private key. */
    factory: (privateKey: string) => Promise<TSigner>
}
