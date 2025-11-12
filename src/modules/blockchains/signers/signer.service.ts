import { Inject, Injectable } from "@nestjs/common"
import { Network, PlatformId } from "@modules/common"
import { UserSchema } from "@modules/databases"
import { Ed25519Keypair as SuiEd25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Keypair as SolanaKeypair } from "@solana/web3.js"
import { ethers } from "ethers"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./signers.module-definition"
import { GcpKmsService } from "@modules/gcp"

export interface WithSignerParams<TSigner, TResponse = void> {
  user: UserSchema
  network?: Network
  platformId: PlatformId
  action: (signer: TSigner) => Promise<TResponse>
  factory: (privateKey: Uint8Array) => TSigner
}

@Injectable()
export class SignerService {
    constructor(
    private readonly gcpKmsService: GcpKmsService,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: typeof OPTIONS_TYPE
    ) {}

    private async withSigner<TSigner, TResponse = void>({
        user,
        network = Network.Mainnet,
        platformId,
        action,
        factory,
    }: WithSignerParams<TSigner, TResponse>): Promise<TResponse> {
        let privateKey: Uint8Array | null = null
        try {
            const wallet = user.wallets.find((w) => w.platformId === platformId)
            if (!wallet) throw new Error(`${PlatformId[platformId]} wallet not found`)
            if (network === Network.Testnet) throw new Error("Testnet not supported")

            privateKey = await this.gcpKmsService.decrypt(wallet.encryptedPrivateKey ?? "")
            const signer = factory(privateKey)
            return await action(signer)
        } finally {
            if (privateKey) privateKey.fill(0)
            privateKey = null
        }
    }

    // ------------------------
    // Public wrappers
    // ------------------------

    public withSuiSigner<TResponse = void>(params: {
    user: UserSchema
    network?: Network
    action: (signer: SuiEd25519Keypair) => Promise<TResponse>
  }) {
        return this.withSigner<SuiEd25519Keypair, TResponse>({
            ...params,
            platformId: PlatformId.Sui,
            factory: (pk) => SuiEd25519Keypair.fromSecretKey(Buffer.from(pk).toString("utf-8")),
        })
    }

    public withSolanaSigner<TResponse = void>(params: {
    user: UserSchema
    network?: Network
    action: (signer: SolanaKeypair) => Promise<TResponse>
  }) {
        return this.withSigner<SolanaKeypair, TResponse>({
            ...params,
            platformId: PlatformId.Solana,
            factory: (pk) => SolanaKeypair.fromSecretKey(pk),
        })
    }

    public withEvmSigner<TResponse = void>(params: {
    user: UserSchema
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