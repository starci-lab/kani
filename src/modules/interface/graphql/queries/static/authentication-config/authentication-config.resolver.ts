import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    AuthenticationConfigService 
} from "./authentication-config.service"
import {
    GraphQLSuccessMessage 
} from "@modules/api"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    AuthenticationConfigResponse 
} from "./authentication-config.dto"    
import {
    GraphQLTransformInterceptor 
} from "@modules/api"
import {
    UseInterceptors 
} from "@nestjs/common"
import {
    AuthenticationConfig 
} from "@modules/databases"

@Resolver()
export class AuthenticationConfigResolver {
    constructor(
        private readonly authenticationConfigService: AuthenticationConfigService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Authentication config fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => AuthenticationConfigResponse,
        {
            description: "Fetch the authentication config.",
        })
    authenticationConfig(): AuthenticationConfig {
        return this.authenticationConfigService.authenticationConfig()
    }
}
