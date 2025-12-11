import { ExecutionContext, Injectable } from "@nestjs/common"
import { PRIVY_AUTH_TOKEN_STRATEGY } from "../strategies"
import { AuthGuard } from "@nestjs/passport"
import { GqlExecutionContext } from "@nestjs/graphql"

@Injectable()
export class GraphQLPrivyAuthGuard extends AuthGuard(
    PRIVY_AUTH_TOKEN_STRATEGY
) {
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}