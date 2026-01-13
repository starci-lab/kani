import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    BotV2Request,
    BotV2Response,
} from "./bot-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { BotSchema } from "@modules/databases"
import { BotV2Service } from "./bot-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class BotV2Resolver {
    constructor(
        private readonly botV2Service: BotV2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bot v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => BotV2Response, {
        description:
            "Returns the details of a bot associated with the current user (v2 with Privy authentication).",
    })
    async botV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bot should be fetched.",
        })
            request: BotV2Request,
    ): Promise<BotSchema> {
        return this.botV2Service.botV2(request, response)
    }
}

