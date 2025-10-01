import { ExecutionContext, Injectable } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import {
    JWT_ACCESS_TOKEN_STRATEGY,
    JWT_ACCESS_TOKEN_ONLY_VERIFIED_TOTP_STRATEGY,
    JWT_REFRESH_TOKEN_STRATEGY,
} from "../strategies"
import { GqlExecutionContext } from "@nestjs/graphql"

@Injectable()
export class GraphQLJwtAccessTokenAuthGuard extends AuthGuard(
    JWT_ACCESS_TOKEN_STRATEGY
) {
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}

@Injectable()
export class GraphQLJwtRefreshTokenAuthGuard extends AuthGuard(
    JWT_REFRESH_TOKEN_STRATEGY
) {
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}

@Injectable()
export class GraphQLJwtOnlyVerifiedTOTPAuthGuard extends AuthGuard(
    JWT_ACCESS_TOKEN_ONLY_VERIFIED_TOTP_STRATEGY
) {
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}