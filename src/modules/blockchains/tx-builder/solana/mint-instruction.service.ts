import { Network } from "@modules/common"
import { Connection as SolanaConnection } from "@solana/web3.js"
import { Injectable } from "@nestjs/common"
import { getInitializeMint2Instruction, getMintSize, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { Address, createSolanaRpc, Instruction } from "@solana/kit"
import { createNoopSigner, generateKeyPairSigner, KeyPairSigner } from "@solana/signers"
import { getCreateAccountInstruction } from "@solana-program/system"
import { InjectSolanaClients, HttpAndWsClients } from "../../clients"
import BN from "bn.js"

@Injectable()
export class MintInstructionService {
    constructor(
        @InjectSolanaClients()
        private readonly clients: Record<Network, HttpAndWsClients<SolanaConnection>>,
    ) { }

    async createMint2Instruction(
        {
            ownerAddress,
            network = Network.Mainnet,
            clientIndex = 0,
            withInitialize = false,
        }: CreateMint2InstructionParams
    ): Promise<CreateMint2InstructionResponse> {
        const client = this.clients[network].http[clientIndex]
        const rpc = createSolanaRpc(client.rpcEndpoint)
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
    network?: Network;
    clientIndex?: number;
    withInitialize?: boolean;
}

export interface CreateMint2InstructionResponse {
    instructions: Array<Instruction>
    mintKeyPair: KeyPairSigner
}