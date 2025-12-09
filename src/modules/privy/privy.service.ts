import { Injectable } from "@nestjs/common"
import { InjectPrivy } from "./privy.decorators"
import { PrivyClient, User } from "@privy-io/node"
import { BotSchema } from "@modules/databases"
import { chainIdToPlatformId, PlatformId } from "@typedefs"
import { Wallet, WalletChainType } from "@privy-io/node/resources"
import { AsyncService } from "@modules/mixin"

@Injectable()
export class PrivyService {
    constructor(
        @InjectPrivy()
        private readonly privyClient: PrivyClient,
        private readonly asyncService: AsyncService,
    ) {}

    async getOrCreateUser(
        bot: BotSchema
    ): Promise<User> {
        // check if the user already exists
        const [user] = await this.asyncService.resolveTuple(
            this.privyClient.users().getByCustomAuthID({
                custom_user_id: bot.id,
            }))
        if (user) {
            return user
        }
        return await this.privyClient.users().create({
            linked_accounts: [
                {
                    type: "custom_auth",
                    custom_user_id: bot.id,
                }
            ],
        })
    }

    private getWalletType(
        platformId: PlatformId
    ): WalletChainType {
        switch (platformId) {
        case PlatformId.Sui:
            return "sui"
        case PlatformId.Evm:
            return "ethereum"
        case PlatformId.Solana:
            return "solana"
        default:
            throw new Error("Invalid platform ID")
        }
    }

    async createWallet(
        bot: BotSchema
    ): Promise<Wallet> {
        const platformId = chainIdToPlatformId(bot.chainId)
        const walletType = this.getWalletType(platformId)
        return await this.privyClient.wallets().create({
            chain_type: walletType,
            owner_id: bot.privyUserId,
        })
    }
}