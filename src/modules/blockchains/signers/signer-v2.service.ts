import { Injectable } from "@nestjs/common"
import { PlatformId } from "@typedefs"
import { BotSchema } from "@modules/databases"
import { DerivedAesKeyService } from "@modules/derived"
import { PrivyWalletService, PrivySigner } from "@modules/privy"

export interface WithSignerV2Params<TResponse = void> {
  bot: BotSchema;
  platformId: PlatformId;
  action: (signer: PrivySigner) => Promise<TResponse>;
  factory: (walletId: string) => PrivySigner;
}

export interface SignTransactionParams {
    signer: PrivySigner
    transactionBytes: string
    hash: string
}

@Injectable()
export class SignerV2Service {
    constructor(
        private readonly derivedAesKeyService: DerivedAesKeyService,
        private readonly privyWalletService: PrivyWalletService
    ) {}

    private async withSigner<TResponse = void>({
        bot,
        platformId,
        action,
        factory,
    }: WithSignerV2Params<TResponse>): Promise<TResponse> {
        let walletId: string | null = null
        try {
            switch (platformId) {
            case PlatformId.Solana:
                walletId = this.derivedAesKeyService.decrypt(
                    bot.encryptedPrivateKeyPayload,
                )
                break
            case PlatformId.Sui:
                walletId = this.derivedAesKeyService.decrypt(
                    bot.encryptedPrivateKeyPayload,
                )
                break
            case PlatformId.Evm:
                walletId = this.derivedAesKeyService.decrypt(
                    bot.encryptedPrivateKeyPayload,
                )
                break
            }
            if (!walletId) throw new Error("Wallet id not found")
            const signer = factory(walletId)
            return await action(signer)
        } finally {
            if (walletId) walletId = null
        }
    }

    // ------------------------
    // Public wrappers
    // ------------------------

    public withSuiSigner<TResponse = void>(params: {
    bot: BotSchema;
    action: (signer: PrivySigner) => Promise<TResponse>;
  }) {
        return this.withSigner<TResponse>({
            ...params,
            platformId: PlatformId.Sui,
            factory: (walletId: string) => this.privyWalletService.createSigner(walletId),
        })
    }

    public withSolanaSigner<TResponse = void>(params: {
    bot: BotSchema;
    action: (signer: PrivySigner) => Promise<TResponse>;
  }) {
        return this.withSigner<TResponse>({
            ...params,
            platformId: PlatformId.Solana,
            factory: (walletId: string) => this.privyWalletService.createSigner(walletId),
        })
    }

    public withEvmSigner<TResponse = void>(params: {
    bot: BotSchema;
    action: (signer: PrivySigner) => Promise<TResponse>;
  }) {
        return this.withSigner<TResponse>({
            ...params,
            platformId: PlatformId.Evm,
            factory: (walletId: string) => this.privyWalletService.createSigner(walletId),
        })
    }
}
