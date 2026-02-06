import {
    Injectable
} from "@nestjs/common"
import {
    generateKeyPairSigner
} from "@solana/kit"
import {
    GenerateKeypairsResult
} from "../types"

/**
 * Service for generating Solana keypair signers in bulk.
 *
 * @example
 * const keypairs = await keypairGeneratorsService.generateKeypairs(5)
 */
@Injectable()
export class KeypairGeneratorsService {
    constructor() {}

    /**
     * Generates a number of keypair signers.
     *
     * @param count - Number of keypairs to generate
     * @returns Array of keypair signers
     *
     * @example
     * const signers = await service.generateKeypairs(10)
     */
    async generateKeypairs(count: number): Promise<GenerateKeypairsResult> {
        return Promise.all(
            Array.from(
                {
                    length: count 
                },
                async () => await generateKeyPairSigner()
            )
        )
    }
}
