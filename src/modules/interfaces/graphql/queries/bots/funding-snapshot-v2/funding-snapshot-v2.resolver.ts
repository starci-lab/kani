import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    FundingSnapshotV2Request,
    FundingSnapshotV2Response,
    FundingSnapshotV2ResponseData,
} from "./funding-snapshot-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { FundingSnapshotV2Service } from "./funding-snapshot-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class FundingSnapshotV2Resolver {
    constructor(
        private readonly fundingSnapshotV2Service: FundingSnapshotV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Funding snapshot v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => FundingSnapshotV2Response, {
        description:
            "Returns the funding snapshot associated with a bot (v2 with Privy authentication).",
    })
    async fundingSnapshotV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bot's reserves should be fetched.",
        })
            request: FundingSnapshotV2Request,
    ): Promise<FundingSnapshotV2ResponseData> {
        return this.fundingSnapshotV2Service.fundingSnapshotV2(request, response)
    }
}

