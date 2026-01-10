import { ExecutionContext, Injectable } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import {
    JWT_PRIVY_STRATEGY,
} from "../strategies"
import { GqlExecutionContext } from "@nestjs/graphql"

@Injectable()
export class GraphQLJwtPrivyAuthGuard extends AuthGuard(
    JWT_PRIVY_STRATEGY
) {
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}