import { Injectable } from "@nestjs/common"
import { Address, address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit"

@Injectable()
export class PositionService {

    /**
     * Derives the PDA for a Orca CLMM PositionState.
     */
    async getPda({
        nftMintAddress,
        programAddress,
    }: GetPositionPdaParams): 
    Promise<GetPositionPdaResponse> 
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

export interface GetPositionPdaParams {
    nftMintAddress: Address
    programAddress: Address
}

export interface GetPositionPdaResponse {
    pda: Address
}