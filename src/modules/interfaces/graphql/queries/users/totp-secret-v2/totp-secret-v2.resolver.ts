import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"
import {
    TotpSecretV2Response, TotpSecretV2ResponseData 
} from "./totp-secret-v2.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    TotpSecretV2Service 
} from "./totp-secret-v2.service"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class TotpSecretV2Resolver {
    constructor(
        private readonly totpSecretV2Service: TotpSecretV2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("TOTP secret fetched successfully")
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => TotpSecretV2Response,
        {
            description: "Fetch the TOTP secret for the current user (v2 with Privy authentication).",
        })
    @UseInterceptors(GraphQLTransformInterceptor)
    async totpSecretV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
    ): Promise<TotpSecretV2ResponseData> {
        return this.totpSecretV2Service.totpSecretV2(response)
    }
}
