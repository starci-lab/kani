import {
    Injectable
} from "@nestjs/common"
import {
    Keypair as SolanaKeypair 
} from "@solana/web3.js"

/**
 * Service for managing Solana keypairs.
 * Handles creation and management of Solana keypairs for transaction signing.
 *
 * @example
 * const service = new SolanaKeypairService(...)
 * const keypair = await service.generateKeypair()
 */
@Injectable()
export class SolanaKeypairService {
    constructor() {}
    
    /**
     * Generates a new Solana keypair.
     *
     * @returns Solana keypair
     *
     * @example
     * const keypair = await service.generateKeypair()
     */
    async generateKeypair(): Promise<SolanaKeypair> {
        return SolanaKeypair.generate()
    }
}