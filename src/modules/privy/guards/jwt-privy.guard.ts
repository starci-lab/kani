import {
    ExecutionContext, Injectable 
} from "@nestjs/common"
import {
    AuthGuard 
} from "@nestjs/passport"
import {
    JWT_PRIVY_STRATEGY,
} from "../strategies"
import {
    GqlExecutionContext 
} from "@nestjs/graphql"

/**
 * The GraphQL JWT Privy auth guard.
 */
@Injectable()
export class GraphQLJwtPrivyAuthGuard extends AuthGuard(
    JWT_PRIVY_STRATEGY
) {
    /**
     * Get the request from the context.
     * @param context - The execution context.
     * @returns The request.
     */
    getRequest(context: ExecutionContext) {
        return GqlExecutionContext.create(context).getContext().req
    }
}