import { UserGoogleLike } from "../types"
import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"

export const GoogleUser = createParamDecorator(
    (_: unknown, context: ExecutionContext) => {
        const ctx = context.switchToHttp().getRequest()
        return ctx.user as UserGoogleLike
    })

export const GraphQLUser = createParamDecorator(
    (_: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context).getContext()
        return ctx.req?.user ?? null
    })