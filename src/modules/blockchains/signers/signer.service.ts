import { Injectable } from "@nestjs/common"
import { PlatformId } from "@modules/common"
import { BotSchema } from "@modules/databases"
import { Ed25519Keypair as SuiEd25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { createKeyPairFromBytes, createSignerFromKeyPair, KeyPairSigner } from "@solana/kit"
import { ethers } from "ethers"
import { EncryptionService } from "@modules/crypto"
import bs58 from "bs58"

export interface WithSignerParams<TSigner, TResponse = void> {
  bot: BotSchema
  platformId: PlatformId
  action: (signer: TSigner) => Promise<TResponse>
  factory: (privateKey: string) => Promise<TSigner>
}

@Injectable()
export class SignerService {
    constructor(
    private readonly encryptionService: EncryptionService
    ) {}

    private async withSigner<TSigner, TResponse = void>({
        bot,
        platformId,
        action,
        factory,
    }: WithSignerParams<TSigner, TResponse>): Promise<TResponse> {
        let privateKey: string | null = null
        try {
            if (platformId === PlatformId.Solana) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            } else if (platformId === PlatformId.Sui) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            } else if (platformId === PlatformId.Evm) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            }
            if (!privateKey) throw new Error("Private key not found")
            const signer = await factory(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey = null
        }
    }

    // ------------------------
    // Public wrappers
    // ------------------------

    public withSuiSigner<TResponse = void>(params: {
    bot: BotSchema
    action: (signer: SuiEd25519Keypair) => Promise<TResponse>
  }) {
        return this.withSigner<SuiEd25519Keypair, TResponse>({
            ...params,
            platformId: PlatformId.Sui,
            factory: async (privateKey) => SuiEd25519Keypair.fromSecretKey(privateKey),
        })
    }

    public withSolanaSigner<TResponse = void>(params: {
    bot: BotSchema
    action: (signer: KeyPairSigner) => Promise<TResponse>
  }) {
        return this.withSigner<KeyPairSigner, TResponse>({
            ...params,
            platformId: PlatformId.Solana,
            factory: async (privateKey) => {
                const keyPair = await createKeyPairFromBytes(bs58.decode(privateKey))
                const kitSigner = await createSignerFromKeyPair(keyPair)
                return kitSigner
            },
        })
    }

    public withEvmSigner<TResponse = void>(params: {
    bot: BotSchema
    action: (signer: ethers.Wallet) => Promise<TResponse>
  }) {
        return this.withSigner<ethers.Wallet, TResponse>({
            ...params,
            platformId: PlatformId.Evm,
            factory: async (pk) => new ethers.Wallet(Buffer.from(pk).toString("hex")),
        })
    }
}