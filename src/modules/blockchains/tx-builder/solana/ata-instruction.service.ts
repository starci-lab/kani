import {
    Injectable
} from "@nestjs/common"
import {
    Address,
    fetchEncodedAccount,
    createNoopSigner,
    getAddressEncoder,
    address,
    generateKeyPairSigner,
} from "@solana/kit"
import {
    TOKEN_2022_PROGRAM_ADDRESS,
    getTokenSize as getToken2022Size,
    getInitializeAccountInstruction as getToken2022InitializeAccountInstruction,
    getCloseAccountInstruction as getToken2022CloseAccountInstruction,
    getCreateAssociatedTokenInstruction as getToken2022CreateAssociatedTokenInstruction,
    findAssociatedTokenPda as findToken2022AssociatedTokenPda,
} from "@solana-program/token-2022"
import {
    TOKEN_PROGRAM_ADDRESS,
    findAssociatedTokenPda,
    getCreateAssociatedTokenInstruction,
    getTokenSize,
    getInitializeAccountInstruction,
    getCloseAccountInstruction,
} from "@solana-program/token"
import {
    getCreateAccountWithSeedInstruction
} from "@solana-program/system"
import BN from "bn.js"
import {
    sha256
} from "@noble/hashes/sha2"
import {
    PublicKey
} from "@solana/web3.js"
import {
    RpcExecutorService
} from "@modules/blockchains"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    CreateWSolAccountInstructionsParams,
    CreateWSolAccountInstructionsResult,
    GeneratePubKeyParams,
    GeneratePubKeyResult,
    GetOrCreateAtaInstructionsParams,
    GetOrCreateAtaInstructionsResult
} from "../types"
import {
    WSOL_MINT_ADDRESS 
} from "../constants"

/**
 * Service for Solana associated token account (ATA) and wrapped SOL (WSOL) instructions.
 *
 * @example
 * const result = await ataInstructionService.getOrCreateAtaInstructions({ ownerAddress, tokenMint })
 */
@Injectable()
export class AtaInstructionService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
    ) {}

    /**
     * Returns ATA address and optional create/end instructions; creates WSOL account when tokenMint is omitted.
     *
     * @param param - Token mint (optional for WSOL), owner, token program variant, amount, pdaOnly
     * @returns ATA address and optional instructions
     *
     * @example
     * const { ataAddress, instructions } = await service.getOrCreateAtaInstructions({ ownerAddress, tokenMint })
     */
    async getOrCreateAtaInstructions({
        tokenMint,
        ownerAddress,
        is2022Token = false,
        pdaOnly = false,
        amount = new BN(0),
    }: GetOrCreateAtaInstructionsParams): Promise<GetOrCreateAtaInstructionsResult> {
        if (!tokenMint) {
            return await this.createWSolAccountInstructions({
                ownerAddress,
                is2022Token,
                amount,
                pdaOnly,
            })
        }

        const tokenProgram = is2022Token
            ? TOKEN_2022_PROGRAM_ADDRESS
            : TOKEN_PROGRAM_ADDRESS
        const _findAssociatedTokenPda = is2022Token
            ? findToken2022AssociatedTokenPda
            : findAssociatedTokenPda

        const [ataAddress] = await _findAssociatedTokenPda({
            mint: tokenMint,
            owner: ownerAddress,
            tokenProgram,
        })

        if (pdaOnly) {
            return {
                ataAddress 
            }
        }

        // check if ATA already exists
        const encodedAccount = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await fetchEncodedAccount(rpc,
                    ataAddress)
            },
        })

        if (encodedAccount.exists) {
            return {
                ataAddress 
            }
        }

        const _getCreateAssociatedTokenInstruction = is2022Token
            ? getToken2022CreateAssociatedTokenInstruction
            : getCreateAssociatedTokenInstruction
        const createInstruction = _getCreateAssociatedTokenInstruction({
            ata: ataAddress,
            payer: createNoopSigner(ownerAddress),
            owner: ownerAddress,
            mint: tokenMint,
            tokenProgram,
        })

        return {
            ataAddress,
            instructions: [createInstruction],
            endInstructions: [],
        }
    }

    /**
     * Builds instructions to create a wrapped SOL account and optional close instruction for end.
     *
     * @param param - Owner, token program variant, amount, optional pdaOnly
     * @returns Create + initialize instructions, end instructions, and ATA address
     *
     * @example
     * const { instructions, endInstructions, ataAddress } = await service.createWSolAccountInstructions({ ownerAddress, amount })
     */
    async createWSolAccountInstructions({
        ownerAddress,
        is2022Token = false,
        amount,
    }: CreateWSolAccountInstructionsParams): Promise<CreateWSolAccountInstructionsResult> {
        const programAddress = is2022Token
            ? TOKEN_2022_PROGRAM_ADDRESS
            : TOKEN_PROGRAM_ADDRESS
        const space = is2022Token ? getToken2022Size() : getTokenSize()

        const balanceNeeded = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await rpc
                    .getMinimumBalanceForRentExemption(
                        BigInt(is2022Token ? getToken2022Size() : getTokenSize()),
                        {
                            commitment: "confirmed",
                        },
                    )
                    .send()
            },
        })

        const lamports = amount.add(new BN(balanceNeeded))

        const { publicKey: newAccount, seed } = await this.generatePubKey({
            fromAddress: ownerAddress,
            programAddress,
        })

        const _getInitializeAccountInstruction = is2022Token
            ? getToken2022InitializeAccountInstruction
            : getInitializeAccountInstruction
        const _getCloseAccountInstruction = is2022Token
            ? getToken2022CloseAccountInstruction
            : getCloseAccountInstruction

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

    /**
     * Generates a program-derived keypair (with optional seed) for use as new account.
     *
     * @param param - Base address, program address, optional assign seed
     * @returns Public key and seed used
     *
     * @example
     * const { publicKey, seed } = await service.generatePubKey({ fromAddress, programAddress })
     */
    async generatePubKey({
        fromAddress,
        programAddress,
        assignSeed,
    }: GeneratePubKeyParams): Promise<GeneratePubKeyResult> {
        const { address } = await generateKeyPairSigner()
        const seed = assignSeed
            ? btoa(assignSeed).slice(0,
                32)
            : address.slice(0,
                32)
        const publicKey = this.createWithSeed(fromAddress,
            seed,
            programAddress)
        return {
            publicKey, seed 
        }
    }

    private createWithSeed(
        fromAddress: Address,
        seed: string,
        programAddress: Address,
    ): Address {
        const buffer = Buffer.concat([
            Buffer.from(getAddressEncoder().encode(fromAddress)),
            Buffer.from(seed),
            Buffer.from(getAddressEncoder().encode(programAddress)),
        ])
        const publicKeyBytes = sha256(buffer)
        return address(new PublicKey(publicKeyBytes).toBase58())
    }
}
