import { Injectable } from "@nestjs/common"
import { getInitializeMint2Instruction, getMintSize, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { Address, createSolanaRpc, Instruction } from "@solana/kit"
import { createNoopSigner, generateKeyPairSigner, KeyPairSigner } from "@solana/signers"
import { getCreateAccountInstruction } from "@solana-program/system"
import BN from "bn.js"

@Injectable()
export class MintInstructionService {
    constructor(
    ) { }

    async createMint2Instruction(
        {
            ownerAddress,
            url,

            withInitialize = false,
        }: CreateMint2InstructionParams
    ): Promise<CreateMint2InstructionResponse> {
        const rpc = createSolanaRpc(url)
        const space = getMintSize()
        const balanceNeeded = await rpc.getMinimumBalanceForRentExemption(
            BigInt(
                space 
            ), {
                commitment: "confirmed"
            }).send()
        const lamports = new BN(balanceNeeded)
        const mintKeyPair = await generateKeyPairSigner()
        // create mint account instruction
        const instructions: Array<Instruction> = []
        const createMintAccountInstruction = getCreateAccountInstruction({
            payer: createNoopSigner(ownerAddress),
            space,
            newAccount: createNoopSigner(mintKeyPair.address),
            programAddress: TOKEN_2022_PROGRAM_ADDRESS,
            lamports: lamports.toNumber(),
        })
        // append create mint account instruction
        instructions.push(createMintAccountInstruction)
        // append initialize mint instruction
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

export interface CreateMint2InstructionParams {
    ownerAddress: Address;
    url: string;
    withInitialize?: boolean;
}

export interface CreateMint2InstructionResponse {
    instructions: Array<Instruction>
    mintKeyPair: KeyPairSigner
}