import { UserLoaderService } from "@features/fetchers"
import { Injectable } from "@nestjs/common"
import { UserWalletParams, UserWalletResponseDto } from "./user-v1.dto"

@Injectable()
export class UserV1Service {
    constructor(
        private userLoaderService: UserLoaderService,
    ) {}

    async getUserWallet(
        params: UserWalletParams
    ): Promise<UserWalletResponseDto> {
        const users = await this.userLoaderService.loadUsers()
        const user = users[0]
        const wallet = user.wallets.find((wallet) => wallet.type === )
    }
}
