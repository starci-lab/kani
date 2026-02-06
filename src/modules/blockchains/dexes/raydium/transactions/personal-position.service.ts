import {
    Injectable 
} from "@nestjs/common"
import {
    Address, address, getAddressEncoder, getProgramDerivedAddress 
} from "@solana/kit"
import {
    GetPersonalPositionPdaParams,
    GetPersonalPositionPdaResult,
    VerifyPersonalPositionPdaParams
} from "../types"

/**
 * Service responsible for deriving personal position PDAs for Raydium.
 * Handles program derived address generation for personal positions.
 *
 * @example
 * const service = new PersonalPositionService()
 * const result = await service.getPda({ nftMintAddress, programAddress })
 */
@Injectable()
export class PersonalPositionService {

    /**
     * Derives the PDA for a Raydium CLMM PersonalPositionState.
     *
     * Raydium defines the account as:
     * seeds = [
     *   "personal_position",
     *   nft_mint_pubkey
     * ]
     *
     * This PDA is deterministic. Each position NFT has exactly one
     * associated PersonalPositionState PDA.
     */
    async getPda({
        nftMintAddress,
        programAddress,
    }: GetPersonalPositionPdaParams): 
    Promise<GetPersonalPositionPdaResult> 
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
