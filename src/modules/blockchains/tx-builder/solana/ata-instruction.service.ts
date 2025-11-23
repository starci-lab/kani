
import { Injectable } from "@nestjs/common"
import { Address, Instruction, fetchEncodedAccount, createSolanaRpc, createNoopSigner, getAddressEncoder, address,  } from "@solana/kit"
import { TOKEN_2022_PROGRAM_ADDRESS, getTokenSize as getToken2022Size, getInitializeAccountInstruction as getToken2022InitializeAccountInstruction, 
    getCloseAccountInstruction as getToken2022CloseAccountInstruction, 
    getCreateAssociatedTokenInstruction as getToken2022CreateAssociatedTokenInstruction,
    findAssociatedTokenPda as findToken2022AssociatedTokenPda
} from "@solana-program/token-2022"
import { TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, 
    getCreateAssociatedTokenInstruction, 
    getTokenSize, getInitializeAccountInstruction, getCloseAccountInstruction } from "@solana-program/token"
import { HttpAndWsClients, InjectSolanaClients } from "../../clients"
import { Network } from "@modules/common"
import { Keypair, PublicKey, Connection as SolanaConnection } from "@solana/web3.js"
import { getCreateAccountWithSeedInstruction } from "@solana-program/system"
import BN from "bn.js"
import { sha256 } from "@noble/hashes/sha2"

export const WSOL_MINT_ADDRESS = address("So11111111111111111111111111111111111111112")

@Injectable()
export class AtaInstructionService {
    constructor(
        @InjectSolanaClients()
        private readonly clients: Record<Network, HttpAndWsClients<SolanaConnection>>,
    ) { }

    async getOrCreateAtaInstructions(
        {
            tokenMint,
            ownerAddress,
            is2022Token = false,
            network = Network.Mainnet,
            clientIndex = 0,
            pdaOnly = false,
            amount = new BN(0),
        }: GetOrCreateAtaInstructionsParams
    ): Promise<GetOrCreateAtaInstructionsResponse> {
        const client = this.clients[network].http[clientIndex]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        if (!tokenMint) {
            return await this.createWSolAccountInstructions(
                {
                    ownerAddress,
                    network,
                    clientIndex,
                    is2022Token,
                    amount,
                    pdaOnly,
                }
            )
        }
        const tokenProgram = is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS
        const _findAssociatedTokenPda = is2022Token ? findToken2022AssociatedTokenPda : findAssociatedTokenPda
        const [ataAddress] = await _findAssociatedTokenPda(
            {
                mint: tokenMint,
                owner: ownerAddress,
                tokenProgram,
            }
        )
        if (pdaOnly) {
            return {
                ataAddress,
            }
        }
        const encodedAccount = await fetchEncodedAccount(rpc, ataAddress)
        if (encodedAccount.exists) {
            return {
                ataAddress,
            }
        }
        const _getCreateAssociatedTokenInstruction = 
        is2022Token 
            ? getToken2022CreateAssociatedTokenInstruction 
            : getCreateAssociatedTokenInstruction
        const createInstruction = _getCreateAssociatedTokenInstruction(
            {
                ata: ataAddress,
                payer: createNoopSigner(ownerAddress),
                owner: ownerAddress,
                mint: tokenMint,
                tokenProgram,
            }
        )
        return {
            ataAddress,
            instructions: [createInstruction],
            endInstructions: [],
        }
    }

    async createWSolAccountInstructions(
        {
            ownerAddress,
            network = Network.Mainnet,
            clientIndex = 0,
            is2022Token = false,
            amount,
        }: CreateWSolAccountInstructionsParams
    ): Promise<CreateWSolAccountInstructionsResponse> {
        const programAddress = is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS
        const client = this.clients[network].http[clientIndex]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const space = is2022Token 
            ? getToken2022Size() 
            : getTokenSize()
        const balanceNeeded = await rpc.getMinimumBalanceForRentExemption(
            BigInt(
                is2022Token 
                    ? getToken2022Size() 
                    : getTokenSize()
            ), {
                commitment: "confirmed"
            }).send()
        const lamports = amount.add(new BN(balanceNeeded))
        const { publicKey: newAccount, seed } = this.generatePubKey({ fromAddress: ownerAddress, programAddress })
        const _getInitializeAccountInstruction = is2022Token ? getToken2022InitializeAccountInstruction : getInitializeAccountInstruction
        const _getCloseAccountInstruction = is2022Token ? getToken2022CloseAccountInstruction : getCloseAccountInstruction
        return {
            instructions: [
                getCreateAccountWithSeedInstruction({
                    newAccount,
                    seed,
                    amount: lamports.toNumber(),
                    base: ownerAddress,
                    payer: createNoopSigner(ownerAddress),
                    space,
                    programAddress,
                }),
                _getInitializeAccountInstruction({
                    mint: WSOL_MINT_ADDRESS,
                    owner: ownerAddress,
                    account: newAccount,
                }), 
            ],
            endInstructions: [
                _getCloseAccountInstruction({
                    account: newAccount,    
                    destination: ownerAddress,
                    owner: ownerAddress,
                }),
            ],
            ataAddress: newAccount,
        }
    }

    generatePubKey({
        fromAddress,
        programAddress,
        assignSeed,
    }: GeneratePubKeyParams): GeneratePubKeyResponse {
        const seed = assignSeed ? btoa(assignSeed).slice(0, 32) : Keypair.generate().publicKey.toBase58().slice(0, 32)
        const publicKey = this.createWithSeed(fromAddress, seed, programAddress)
        return { publicKey: address(publicKey), seed }
    }
      
    private createWithSeed(
        fromAddress: Address, 
        seed: string, 
        programAddress: Address
    ): Address {
        const buffer = Buffer.concat([
            Buffer.from(getAddressEncoder().encode(fromAddress)), 
            Buffer.from(seed), 
            Buffer.from(getAddressEncoder().encode(programAddress))
        ])
        const publicKeyBytes = sha256(buffer)
        return address(new PublicKey(publicKeyBytes).toBase58())
    }
}

export interface GetOrCreateAtaInstructionsParams {
    tokenMint?: Address;
    ownerAddress: Address;
    is2022Token?: boolean;
    network?: Network;
    clientIndex?: number;
    amount?: BN;
    pdaOnly?: boolean;
}

export interface GetOrCreateAtaInstructionsResponse {
    ataAddress: Address;
    instructions?: Array<Instruction>;
    endInstructions?: Array<Instruction>;
}

export interface CreateWSolAccountInstructionsParams {
    ownerAddress: Address;
    network?: Network;
    clientIndex?: number;
    is2022Token?: boolean;
    amount: BN;
    pdaOnly?: boolean;
}

export interface CreateWSolAccountInstructionsResponse {
    instructions: Array<Instruction>;
    endInstructions: Array<Instruction>;
    ataAddress: Address;
}

export interface GeneratePubKeyParams { 
    fromAddress: Address
    programAddress: Address
    assignSeed?: string
}

export interface GeneratePubKeyResponse {
    publicKey: Address;
    seed: string;
}
