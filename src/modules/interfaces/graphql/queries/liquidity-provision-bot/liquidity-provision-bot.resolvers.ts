import { Args, Query, Resolver } from "@nestjs/graphql"
import { LiquidityProvisionBotService } from "./liquidity-provision-bot.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyVerifiedTOTPAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    ExportedAccountRequest,
    ExportedAccountResponse,
    ExportedAccountResponseData,
    LiquidityProvisionBotRequest,
    LiquidityProvisionBotResponse,
} from "./liquidity-provision-bot.dto"
import { GraphQLTOTPGuard } from "@modules/totp"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage } from "@interfaces/graphql/interceptors"
import { GraphQLTransformInterceptor } from "@interfaces/graphql/interceptors"
import { LiquidityProvisionBotSchema } from "@modules/databases"
import { GraphQLJwtAccessTokenAuthGuard } from "@modules/passport"

@Resolver()
export class LiquidityProvisionBotResolver {
    constructor(
        private readonly liquidityProvisionBotService: LiquidityProvisionBotService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("Liquidity provision bot exported successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard, GraphQLTOTPGuard)
    @Query(() => ExportedAccountResponse, {
        description:
            "Returns the exported wallet keypair (account address and private key) associated with a specific liquidity provision bot. This operation requires TOTP verification for security.",
    })
    async exportedAccount(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which liquidity provision bot's account should be exported.",
        })
            request: ExportedAccountRequest,
    ): Promise<ExportedAccountResponseData> {
        return this.liquidityProvisionBotService.exportedAccount(request, user)
    }

    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("Liquidity provision bot fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    //@UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => LiquidityProvisionBotResponse, {
        description:
            "Returns the details of a liquidity provision bot associated with the current user.",
    })
    async liquidityProvisionBot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which liquidity provision bot should be fetched.",
        })
            request: LiquidityProvisionBotRequest,
    ): Promise<LiquidityProvisionBotSchema> {
        return this.liquidityProvisionBotService.liquidityProvisionBot(request, user)
    }
}
