import { Inject, Injectable } from "@nestjs/common"
import { Wallet } from "ethers"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import base58 from "bs58"
import { WalletSchema } from "@modules/databases"
import { MODULE_OPTIONS_TOKEN } from "./keypairs.module-definition"
import { KeypairsOptions } from "./types"
import { ModuleRef } from "@nestjs/core"
import { GcpKmsService } from "@modules/gcp"
import { EncryptionService } from "@modules/crypto"
import { PlatformId } from "@modules/common"

export interface Keypairs {
    evmKeypair: WalletSchema
    suiKeypair: WalletSchema
    solanaKeypair: WalletSchema
}

@Injectable()
export class KeypairsService {
    private readonly gcpKmsService: GcpKmsService
    private readonly encryptionService: EncryptionService
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: KeypairsOptions,
        private readonly moduleRef: ModuleRef
    ) {
        if (options.useGcpKms) {
            this.gcpKmsService = this.moduleRef.get(GcpKmsService, { strict: false })
        } else {
            this.encryptionService = this.moduleRef.get(EncryptionService, { strict: false })
        }
    }
    
    public async generateKeypairs(): Promise<Keypairs> {
        const evmWallet = Wallet.createRandom()
        const suiWallet = Ed25519Keypair.generate()
        const solanaWallet = SolanaKeypair.generate()
        const [evmEncryptedPrivateKey, suiEncryptedPrivateKey, solanaEncryptedPrivateKey] =
        this.options.useGcpKms ? await Promise.all([
            this.gcpKmsService.encrypt(evmWallet.privateKey),
            this.gcpKmsService.encrypt(suiWallet.getSecretKey()),
            this.gcpKmsService.encrypt(base58.encode(solanaWallet.secretKey))
        ]) : [
            this.encryptionService.encrypt(evmWallet.privateKey),
            this.encryptionService.encrypt(suiWallet.getSecretKey()),
            this.encryptionService.encrypt(base58.encode(solanaWallet.secretKey))
        ]
        
        return {
            evmKeypair: {
                publicKey: evmWallet.address,
                encryptedPrivateKey: evmEncryptedPrivateKey,
                platformId: PlatformId.Evm
            },
            suiKeypair: {
                publicKey: suiWallet.getPublicKey().toSuiAddress(),
                encryptedPrivateKey: suiEncryptedPrivateKey,
                platformId: PlatformId.Sui
            },
            solanaKeypair: {
                publicKey: solanaWallet.publicKey.toBase58(),
                encryptedPrivateKey: solanaEncryptedPrivateKey,
                platformId: PlatformId.Solana
            }
        }
    }
}
