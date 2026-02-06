import {
    Injectable 
} from "@nestjs/common"
import {
    getProgramDerivedAddress, address 
} from "@solana/kit"
import {
    GetEventAuthorityPdaParams,
    GetEventAuthorityPdaResult
} from "../types"

/**
 * Service responsible for deriving event authority PDAs for Meteora.
 * Handles program derived address generation for event authorities.
 *
 * @example
 * const service = new EventAuthorityService()
 * const result = await service.getPda({ programAddress })
 */
@Injectable()
export class EventAuthorityService {
    /**
     * Public API: Derive EventAuthority PDA from a program address.
     */
    async getPda({
        programAddress,
    }: GetEventAuthorityPdaParams): Promise<GetEventAuthorityPdaResult> {
        const [pda] = await getProgramDerivedAddress({
            programAddress: address(programAddress),
            seeds: [
                Buffer.from("__event_authority"),
            ],
        })
        return {
            pda: address(pda),
        }
    }
}
