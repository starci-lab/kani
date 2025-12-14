import { Injectable } from "@nestjs/common"
import { Wallet } from "ethers"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import base58 from "bs58"
import { WalletSchema } from "@modules/databases"
import { GeneratedKeypair } from "./types"
import { PlatformId } from "@typedefs"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { GcpKmsService } from "@modules/gcp"
import { AsyncService } from "@modules/mixin"

export interface Keypairs {
    evmKeypair: WalletSchema
    suiKeypair: WalletSchema
    solanaKeypair: WalletSchema
}

@Injectable()
export class KeypairsService {
    constructor(
        private readonly gcpKmsService: GcpKmsService,
        private readonly asyncService: AsyncService,
    ) { }

    public async generateKeypair(
        platformId: PlatformId,
    ): Promise<GeneratedKeypair> {
        switch (platformId) {
        case PlatformId.Evm:
        {
            const evmWallet = Wallet.createRandom()
            const evmEncryptedPrivateKey = await this.gcpKmsService.encrypt(evmWallet.privateKey)
            return { 
                accountAddress: evmWallet.address, 
                encryptedPrivateKey: evmEncryptedPrivateKey 
            }
        }
        case PlatformId.Sui:
        {
            const suiWallet = Ed25519Keypair.generate()
            const suiEncryptedPrivateKey = await this.gcpKmsService.encrypt(suiWallet.getSecretKey())
            return { 
                accountAddress: suiWallet.getPublicKey().toSuiAddress(), 
                encryptedPrivateKey: suiEncryptedPrivateKey 
            }
        }
        case PlatformId.Solana:
        {
            const solanaWallet = SolanaKeypair.generate()
            const solanaEncryptedPrivateKey = await this.gcpKmsService.encrypt(base58.encode(solanaWallet.secretKey))
            return { 
                accountAddress: solanaWallet.publicKey.toString(), 
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
        ] = await this.asyncService.allMustDone(    
            [
                (async () => await this.gcpKmsService.encrypt(evmWallet.privateKey))(),
                (async () => await this.gcpKmsService.encrypt(suiWallet.getSecretKey()))(),
                (async () => await this.gcpKmsService.encrypt(base58.encode(solanaWallet.secretKey)))(),
            ]
        )
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

    public async getPrivateKey(
        platformId: PlatformId, 
        encryptedPrivateKey: string
    ): Promise<string> {
        switch (platformId) {
        case PlatformId.Evm:
            return await this.gcpKmsService.decrypt(encryptedPrivateKey)
        case PlatformId.Sui:
            return await this.gcpKmsService.decrypt(encryptedPrivateKey)
        case PlatformId.Solana:
            return await this.gcpKmsService.decrypt(encryptedPrivateKey)
        }
    }
}
