import { Injectable } from "@nestjs/common"
import { generateKeyPairSigner, KeyPairSigner } from "@solana/kit"

@Injectable()
export class KeypairGeneratorsService {
    constructor() { }

    async generateKeypairs(
        count: number,
    ): Promise<Array<KeyPairSigner>> {
        return Promise.all(
            Array.from({ length: count }, 
                async () => await generateKeyPairSigner())
        )
    }
}   
