import { Injectable } from "@nestjs/common"
import { Address, address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit"

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
    Promise<GetPersonalPositionPdaResponse> 
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

export interface GetPersonalPositionPdaParams {
    nftMintAddress: Address
    programAddress: Address
}

export interface GetPersonalPositionPdaResponse {
    pda: Address
}

export interface VerifyPersonalPositionPdaParams {
    nftMintAddress: Address
    programAddress: Address
    candidate: Address
}