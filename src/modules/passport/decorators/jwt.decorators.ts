import {
    createParamDecorator, ExecutionContext 
} from "@nestjs/common"
import {
    GqlExecutionContext 
} from "@nestjs/graphql"

export const GraphQLJwtAccessToken = createParamDecorator(
    (_: unknown, context: ExecutionContext): string => {
        const ctx = GqlExecutionContext.create(context).getContext()
        const headers = ctx.req?.headers
        if (!headers) {
            throw new Error("Headers not found")
        }
        const authorization = headers.authorization
        if (!authorization) {
            throw new Error("Authorization header not found")
        }
        const [type,
            token] = authorization.split(" ")
        if (type !== "Bearer") {
            throw new Error("Invalid authorization type")
        }
        return token
    }
)
