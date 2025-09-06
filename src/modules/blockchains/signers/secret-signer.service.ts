import { Injectable } from "@nestjs/common"
import { Ed25519Keypair as SuiEd25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { ethers } from "ethers"
import { Network } from "@modules/common"
import { GcpSecretService } from "@modules/gcp"

export interface WithSmSignerParams<TSigner, TResponse = void> {
  network?: Network
  action: (signer: TSigner) => Promise<TResponse>
}

@Injectable()
export class SecretSignerService {
    constructor(private readonly gcpSecretService: GcpSecretService) {}

    /**
   * Sui signer from Secret Manager
   */
    public async withSuiSigner<TResponse = void>({
        network = Network.Mainnet,
        action,
    }: WithSmSignerParams<SuiEd25519Keypair, TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            if (network === Network.Testnet) throw new Error("Testnet not supported")

            const privateKeyHex = await this.gcpSecretService.getSecret("SUI_PRIVATE_KEY")
            if (!privateKeyHex) throw new Error("SUI_PRIVATE_KEY not found in Secret Manager")

            privateKey = Uint8Array.from(Buffer.from(privateKeyHex, "hex"))
            const signer = SuiEd25519Keypair.fromSecretKey(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }

    /**
   * Solana signer from Secret Manager
   */
    public async withSolanaSigner<TResponse = void>({
        network = Network.Mainnet,
        action,
    }: WithSmSignerParams<SolanaKeypair, TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            if (network === Network.Testnet) throw new Error("Testnet not supported")

            const privateKeyJson = await this.gcpSecretService.getSecret("SOLANA_PRIVATE_KEY")
            if (!privateKeyJson) throw new Error("SOLANA_PRIVATE_KEY not found in Secret Manager")

            privateKey = new Uint8Array(JSON.parse(privateKeyJson))
            const signer = SolanaKeypair.fromSecretKey(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }

    /**
   * EVM signer from Secret Manager
   */
    public async withEvmSigner<TResponse = void>({
        network = Network.Mainnet,
        action,
    }: WithSmSignerParams<ethers.Wallet, TResponse>) {
        let privateKey: Uint8Array | null = null
        try {
            if (network === Network.Testnet) throw new Error("Testnet not supported")

            const privateKeyHex = await this.gcpSecretService.getSecret("EVM_PRIVATE_KEY")
            if (!privateKeyHex) throw new Error("EVM_PRIVATE_KEY not found in Secret Manager")

            privateKey = Uint8Array.from(Buffer.from(privateKeyHex, "hex"))
            const signer = new ethers.Wallet(Buffer.from(privateKey).toString("hex"))
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }
}