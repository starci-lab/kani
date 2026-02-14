import {
    Injectable 
} from "@nestjs/common"
import {
    address, getAddressEncoder, getProgramDerivedAddress 
} from "@solana/kit"
import {
    GetPositionPdaParams,
    GetPositionPdaResult
} from "../types"

/**
 * Service responsible for deriving position PDAs for Orca.
 * Handles program derived address generation for positions.
 *
 * @example
 * const service = new PositionService()
 * const result = await service.getPda({ nftMintAddress, programAddress })
 */
@Injectable()
export class PositionService {

    /**
     * Derives the PDA for a Orca CLMM PositionState.
     */
    async getPda({
        nftMintAddress,
        programAddress,
    }: GetPositionPdaParams): 
    Promise<GetPositionPdaResult> 
    {
        // Derive the PDA using Solana Kit
        const [pda] = await getProgramDerivedAddress({
            programAddress,
            seeds: [
                Buffer.from("position"),
                getAddressEncoder().encode(address(nftMintAddress)),
            ],
        })
        return {
            pda,
        }
    }
}
