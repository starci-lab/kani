import {
    Injectable
} from "@nestjs/common"
import {
    getInitializeMint2Instruction,
    getMintSize,
    TOKEN_2022_PROGRAM_ADDRESS
} from "@solana-program/token-2022"
import {
    createSolanaRpc
} from "@solana/kit"
import {
    createNoopSigner,
    generateKeyPairSigner
} from "@solana/signers"
import {
    getCreateAccountInstruction
} from "@solana-program/system"
import type {
    Instruction 
} from "@solana/kit"
import BN from "bn.js"
import {
    CreateMint2InstructionParams,
    CreateMint2InstructionResult
} from "../types"

/**
 * Service for building Token-2022 mint account and initialize instructions.
 *
 * @example
 * const { instructions, mintKeyPair } = await mintInstructionService.createMint2Instruction({ ownerAddress, url, withInitialize: true })
 */
@Injectable()
export class MintInstructionService {
    constructor() {}

    /**
     * Creates instructions for a Token-2022 mint account and optionally initializes the mint.
     *
     * @param param - Owner address, RPC URL, and whether to add initialize mint instruction
     * @returns Instructions and mint keypair
     *
     * @example
     * const result = await service.createMint2Instruction({ ownerAddress, url, withInitialize: true })
     */
    async createMint2Instruction({
        ownerAddress,
        url,
        withInitialize = false,
    }: CreateMint2InstructionParams): Promise<CreateMint2InstructionResult> {
        const rpc = createSolanaRpc(url)
        const space = getMintSize()

        const balanceNeeded = await rpc.getMinimumBalanceForRentExemption(
            BigInt(space),
            {
                commitment: "confirmed"
            }
        ).send()

        const lamports = new BN(balanceNeeded)
        const mintKeyPair = await generateKeyPairSigner()

        const instructions: Array<Instruction> = []
        const createMintAccountInstruction = getCreateAccountInstruction({
            payer: createNoopSigner(ownerAddress),
            space,
            newAccount: createNoopSigner(mintKeyPair.address),
            programAddress: TOKEN_2022_PROGRAM_ADDRESS,
            lamports: lamports.toNumber(),
        })
        instructions.push(createMintAccountInstruction)

        if (withInitialize) {
            const createMintInstruction = getInitializeMint2Instruction({
                mint: mintKeyPair.address,
                decimals: 1,
                mintAuthority: ownerAddress,
            })
            instructions.push(createMintInstruction)
        }

        return {
            instructions,
            mintKeyPair,
        }
    }
}
