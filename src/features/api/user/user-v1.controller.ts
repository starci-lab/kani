import { Controller, Get, HttpStatus, Query } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from "@nestjs/swagger"
import { UserV1Service } from "./user-v1.service"
import { UserWalletParams, UserWalletResponseDto } from "./user-v1.dto"
import { PlatformId } from "@modules/common"

@ApiTags("User (v1)")
@Controller({
    path: "user",
    version: "1",
})
export class UserV1Controller {
    constructor(private readonly userV1Service: UserV1Service) { }

    @ApiOperation({
        summary: "Get wallet",
        description:
            "Fetches the wallet information of the first user loaded in the system, filtered by platformId and network.",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully fetched user wallet",
        type: UserWalletResponseDto,
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Wallet not found" })
    @ApiQuery({
        name: "platformId",
        description: "Platform identifier (e.g., sui, evm, solana)",
        required: false,
        enum: PlatformId,
        default: PlatformId.Sui,
    })
    @Get("wallet")
    async getUserWallet(
        @Query("platformId") platformId: PlatformId,
    ): Promise<UserWalletResponseDto> {
        const params: UserWalletParams = { platformId }
        return this.userV1Service.getUserWallet(params)
    }
}