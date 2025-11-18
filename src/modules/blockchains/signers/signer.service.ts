import { Injectable } from "@nestjs/common"
import { Network, PlatformId } from "@modules/common"
import { BotSchema } from "@modules/databases"
import { Ed25519Keypair as SuiEd25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { ethers } from "ethers"
import { EncryptionService } from "@modules/crypto"
import bs58 from "bs58"

export interface WithSignerParams<TSigner, TResponse = void> {
  bot: BotSchema
  network?: Network
  platformId: PlatformId
  action: (signer: TSigner) => Promise<TResponse>
  factory: (privateKey: string) => TSigner
}

@Injectable()
export class SignerService {
    constructor(
    private readonly encryptionService: EncryptionService
    ) {}

    private async withSigner<TSigner, TResponse = void>({
        bot,
        network = Network.Mainnet,
        platformId,
        action,
        factory,
    }: WithSignerParams<TSigner, TResponse>): Promise<TResponse> {
        let privateKey: string | null = null
        try {
            if (network === Network.Testnet) throw new Error("Testnet not supported")
            if (platformId === PlatformId.Solana) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            } else if (platformId === PlatformId.Sui) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            } else if (platformId === PlatformId.Evm) {
                privateKey = this.encryptionService.decrypt(bot.encryptedPrivateKey ?? "")
            }
            if (!privateKey) throw new Error("Private key not found")
            const signer = factory(privateKey)
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
    network?: Network
    action: (signer: SuiEd25519Keypair) => Promise<TResponse>
  }) {
        return this.withSigner<SuiEd25519Keypair, TResponse>({
            ...params,
            platformId: PlatformId.Sui,
            factory: (privateKey) => SuiEd25519Keypair.fromSecretKey(Buffer.from(privateKey, "utf8")),
        })
    }

    public withSolanaSigner<TResponse = void>(params: {
    bot: BotSchema
    accountAddress: string
    network?: Network
    action: (signer: SolanaKeypair) => Promise<TResponse>
  }) {
        return this.withSigner<SolanaKeypair, TResponse>({
            ...params,
            platformId: PlatformId.Solana,
            factory: (privateKey) => SolanaKeypair.fromSecretKey(bs58.decode(privateKey)),
        })
    }

    public withEvmSigner<TResponse = void>(params: {
    bot: BotSchema
    network?: Network
    action: (signer: ethers.Wallet) => Promise<TResponse>
  }) {
        return this.withSigner<ethers.Wallet, TResponse>({
            ...params,
            platformId: PlatformId.Evm,
            factory: (pk) => new ethers.Wallet(Buffer.from(pk).toString("hex")),
        })
    }
}