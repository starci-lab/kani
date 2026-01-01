import { Injectable } from "@nestjs/common"
import { Wallet } from "ethers"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import base58 from "bs58"
import { GeneratedKeypair } from "./types"
import { EncryptedPayload, PlatformId } from "@typedefs"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { SealedAesService } from "@modules/sealed"

@Injectable()
export class KeypairsService {
    constructor(
        private readonly sealedAesService: SealedAesService,
    ) { }

    public async generateKeypair(
        platformId: PlatformId,
    ): Promise<GeneratedKeypair> {
        switch (platformId) {
        case PlatformId.Evm:
        {
            const evmWallet = Wallet.createRandom()
            const encryptedPrivateKeyPayload = await this.sealedAesService.encrypt(evmWallet.privateKey)
            return { 
                accountAddress: evmWallet.address, 
                encryptedPrivateKeyPayload 
            }
        }
        case PlatformId.Sui:
        {
            const suiWallet = Ed25519Keypair.generate()
            const encryptedPrivateKeyPayload = await this.sealedAesService.encrypt(suiWallet.getSecretKey())
            return { 
                accountAddress: suiWallet.getPublicKey().toSuiAddress(), 
                encryptedPrivateKeyPayload 
            }
        }
        case PlatformId.Solana:
        {
            const solanaWallet = SolanaKeypair.generate()
            const encryptedPrivateKeyPayload = await this.sealedAesService.encrypt(base58.encode(solanaWallet.secretKey))
            return { 
                accountAddress: solanaWallet.publicKey.toString(), 
                encryptedPrivateKeyPayload 
            }
        }
        }
    }

    public async getPrivateKey(
        platformId: PlatformId, 
        encryptedPrivateKeyPayload: EncryptedPayload
    ): Promise<string> {
        switch (platformId) {
        case PlatformId.Evm:
            return await this.sealedAesService.decrypt(encryptedPrivateKeyPayload)
        case PlatformId.Sui:
            return await this.sealedAesService.decrypt(encryptedPrivateKeyPayload)
        case PlatformId.Solana:
            return await this.sealedAesService.decrypt(encryptedPrivateKeyPayload)
        }
    }
}
