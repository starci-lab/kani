import { Injectable } from "@nestjs/common"
import { Network } from "@modules/common"
import { UserAllocationSchema } from "@modules/databases"
import { Ed25519Keypair as SuiEd25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { ethers } from "ethers"
import { GcpKmsService } from "@modules/gcp"

export interface WithSignerParams {
  network?: Network
  userAllocation: UserAllocationSchema
}

// Sui
export interface WithSuiSignerParams<TResponse = void> extends WithSignerParams {
  action: (signer: SuiEd25519Keypair) => Promise<TResponse>
}

// Solana
export interface WithSolanaSignerParams<TResponse = void> extends WithSignerParams {
  action: (signer: SolanaKeypair) => Promise<TResponse>
}

// EVM
export interface WithEvmSignerParams<TResponse = void> extends WithSignerParams {
  action: (signer: ethers.Wallet) => Promise<TResponse>
}

@Injectable()
export class SignerService {
    constructor(private readonly gcpKmsService: GcpKmsService) {}

    /**
   * Sui signer
   */
    public async withSuiSigner
    <TResponse = void>
    ({
        userAllocation,
        network = Network.Mainnet,
        action,
    }: WithSuiSignerParams<TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            const suiWallet = userAllocation.suiWallet
            if (network === Network.Testnet) throw new Error("Testnet not supported")
            // we do not store user key, we use gcp kms to encrypt and decrypt
            // the private key exist in ram for a short time
            // ensure that the private key is cleared from memory
            privateKey = await this.gcpKmsService.decrypt(suiWallet.encryptedPrivateKey)
            const signer = SuiEd25519Keypair.fromSecretKey(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }

    /**
   * Solana signer
   */
    public async withSolanaSigner<TResponse = void>({
        userAllocation,
        network = Network.Mainnet,
        action,
    }: WithSolanaSignerParams<TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            const solanaWallet = userAllocation.solanaWallet
            if (network === Network.Testnet) throw new Error("Testnet not supported")
            privateKey = await this.gcpKmsService.decrypt(solanaWallet.encryptedPrivateKey)
            const signer = SolanaKeypair.fromSecretKey(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }

    /**
   * EVM signer
   */
    public async withEvmSigner<TResponse = void>({
        userAllocation,
        network = Network.Mainnet,
        action,
    }: WithEvmSignerParams<TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            const evmWallet = userAllocation.evmWallet
            if (network === Network.Testnet) throw new Error("Testnet not supported")
            privateKey = await this.gcpKmsService.decrypt(evmWallet.encryptedPrivateKey)

            // ethers Wallet expects a hex string
            const signer = new ethers.Wallet(Buffer.from(privateKey).toString("hex"))
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }
}
