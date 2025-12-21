import { Query, Resolver } from "@nestjs/graphql"
import { TokensService } from "./tokens.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { TokensResponse } from "./tokens.dto"    
import { TokenSchema } from "@modules/databases"
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"

@Resolver()
export class TokensResolver {
    constructor(
        private readonly tokensService: TokensService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Tokens fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => TokensResponse, {
        description: "Fetch all supported tokens.",
    })
    tokens(): Array<TokenSchema> {
        return this.tokensService.tokens()
    }
}

