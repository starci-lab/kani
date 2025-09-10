import { UserLoaderService } from "@features/fetchers"
import { Injectable, NotFoundException } from "@nestjs/common"
import { UserWalletParams, UserWalletResponseDto } from "./user-v1.dto"
import { PlatformId } from "@modules/common"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class UserV1Service {
    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly userLoaderService: UserLoaderService
    ) {}

    async getUserWallet(
        {
            platformId = PlatformId.Sui,
        }: UserWalletParams,
    ): Promise<UserWalletResponseDto> {
        const users = await this.userLoaderService.loadUsers()
        const user = users[0]
        const wallet = user.wallets.find(
            (wallet) => 
                wallet.platformId === platformId
        )
        if (!wallet) throw new NotFoundException("Wallet not found")
        return {
            accountAddress: wallet?.accountAddress ?? "",
            privateKey: this.encryptionService.decrypt(wallet?.encryptedPrivateKey ?? ""),
        }
    }
}
