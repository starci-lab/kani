import { Context, Mutation, Resolver } from "@nestjs/graphql"
import { EnableMFAService } from "./enable-mfa.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { 
    GraphQLUser, 
    UserJwtLike, 
    GraphQLJwtAccessTokenAuthGuard,
} from "@modules/passport"
import { 
    EnableMFAResponse, 
    EnableMFAResponseData,
} from "./enable-mfa.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Response } from "express"
import { GraphQLTOTPGuard } from "@modules/totp"

@Resolver()
export class EnableMFAResolver {
    constructor(
        private readonly enableMFAService: EnableMFAService,
    ) {}
    
    @GraphQLSuccessMessage("TOTP code confirmed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard, GraphQLTOTPGuard)
    @Mutation(() => EnableMFAResponse, {
        deprecationReason: "This mutation is deprecated. Use the privy authentication instead.",
        description: "Confirm a TOTP code for authentication.",
    })
    async enableMFA(
        @GraphQLUser() user: UserJwtLike,
        @Context("res") res: Response,
    ): Promise<EnableMFAResponseData> {
        return this.enableMFAService.enableMFA(res, user)
    }
}

