import {
    createParamDecorator, ExecutionContext 
} from "@nestjs/common"
import {
    GqlExecutionContext 
} from "@nestjs/graphql"

export const PrivyResponse = createParamDecorator(
    (_: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context).getContext()
        return ctx.req?.user ?? null
    }
)