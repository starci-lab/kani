import { Injectable } from "@nestjs/common"
import { Wallet } from "ethers"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import base58 from "bs58"
import { WalletSchema } from "@modules/databases"
import { GeneratedKeypair } from "./types"
import { PlatformId } from "@typedefs"
import { EncryptionService } from "@modules/crypto"

export interface Keypairs {
    evmKeypair: WalletSchema
    suiKeypair: WalletSchema
    solanaKeypair: WalletSchema
}

@Injectable()
export class KeypairsService {
    constructor(
        private readonly encryptionService: EncryptionService,
    ) { }

    public generateKeypair(
        platformId: PlatformId,
    ): GeneratedKeypair {
        switch (platformId) {
        case PlatformId.Evm:
        {
            const evmWallet = Wallet.createRandom()
            const evmEncryptedPrivateKey = this.encryptionService.encrypt(evmWallet.privateKey)
            return { 
                accountAddress: evmWallet.address, 
                encryptedPrivateKey: evmEncryptedPrivateKey 
            }
        }
        case PlatformId.Sui:
        {
            const suiWallet = Ed25519Keypair.generate()
            const suiEncryptedPrivateKey = this.encryptionService.encrypt(suiWallet.getSecretKey())
            return { 
                accountAddress: suiWallet.getPublicKey().toSuiAddress(), 
                encryptedPrivateKey: suiEncryptedPrivateKey 
            }
        }
        case PlatformId.Solana:
        {
            const solanaWallet = SolanaKeypair.generate()
            const solanaEncryptedPrivateKey = this.encryptionService.encrypt(base58.encode(solanaWallet.secretKey))
            return { 
                accountAddress: solanaWallet.publicKey.toBase58(), 
                encryptedPrivateKey: solanaEncryptedPrivateKey 
            }
        }
        }
    }

    public async generateKeypairs(): Promise<Keypairs> {
        const evmWallet = Wallet.createRandom()
        const suiWallet = Ed25519Keypair.generate()
        const solanaWallet = SolanaKeypair.generate()
        const [
            evmEncryptedPrivateKey, 
            suiEncryptedPrivateKey, 
            solanaEncryptedPrivateKey
        ] =
            [
                this.encryptionService.encrypt(evmWallet.privateKey),
                this.encryptionService.encrypt(suiWallet.getSecretKey()),
                this.encryptionService.encrypt(base58.encode(solanaWallet.secretKey)),
            ]
        return {
            evmKeypair: {
                publicKey: evmWallet.address,
                encryptedPrivateKey: evmEncryptedPrivateKey,
                platformId: PlatformId.Evm,
                chainConfigs: []
            },
            suiKeypair: {
                publicKey: suiWallet.getPublicKey().toSuiAddress(),
                encryptedPrivateKey: suiEncryptedPrivateKey,
                platformId: PlatformId.Sui,
                chainConfigs: []
            },
            solanaKeypair: {
                publicKey: solanaWallet.publicKey.toBase58(),
                encryptedPrivateKey: solanaEncryptedPrivateKey,
                platformId: PlatformId.Solana,
                chainConfigs: []
            }
        }
    }

    public getPrivateKey(
        platformId: PlatformId, 
        encryptedPrivateKey: string
    ): string {
        switch (platformId) {
        case PlatformId.Evm:
            return Buffer.from(this.encryptionService.decrypt(encryptedPrivateKey)).toString("utf8")
        case PlatformId.Sui:
            return Buffer.from(this.encryptionService.decrypt(encryptedPrivateKey)).toString("utf8")
        case PlatformId.Solana:
            return Buffer.from(this.encryptionService.decrypt(encryptedPrivateKey)).toString("utf8")
        }
    }
}
