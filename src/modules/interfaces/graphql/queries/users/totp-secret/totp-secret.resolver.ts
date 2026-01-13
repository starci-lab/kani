import { Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLJwtAccessTokenAuthGuard, GraphQLUser } from "@modules/passport"
import { TotpSecretResponse, TotpSecretResponseData } from "./totp-secret.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { UserJwtLike } from "@modules/passport"
import { TotpSecretService } from "./totp-secret.service"

@Resolver()
export class TotpSecretResolver {
    constructor(
        private readonly totpSecretService: TotpSecretService,
    ) {}

    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("TOTP secret fetched successfully")
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => TotpSecretResponse, {
        description: "Fetch the TOTP secret for the current user.",
        deprecationReason: "Use v2 instead",
    })
    @UseInterceptors(GraphQLTransformInterceptor)
    async totpSecret(
        @GraphQLUser() user: UserJwtLike,
    ): Promise<TotpSecretResponseData> {
        return this.totpSecretService.totpSecret(user)
    }
}

