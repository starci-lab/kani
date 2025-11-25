import { Injectable } from "@nestjs/common"
import { getProgramDerivedAddress, Address, address } from "@solana/kit"

@Injectable()
export class EventAuthorityService {
    /**
     * Public API: Derive EventAuthority PDA from a program address.
     */
    async getPda({
        programAddress,
    }: GetEventAuthorityPdaParams): Promise<GetEventAuthorityPdaResponse> {
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

export interface GetEventAuthorityPdaParams {
    programAddress: Address
}

export interface GetEventAuthorityPdaResponse {
    pda: Address
}