import { Field, ObjectType } from "@nestjs/graphql"
import { IsBoolean, IsString } from "class-validator"

@ObjectType({
    isAbstract: true,
    description: "The base response for all GraphQL queries and mutations.",
})
export abstract class AbstractGraphQLResponse {
    @IsBoolean()
    @Field(() => Boolean, {
        description: "The status of the response.",
    })
        status: boolean

    @IsString()
    @Field(() => String, {
        description: "The message of the response.",
    })
        message: string
}

export interface AbstractGraphQLResponseInterface<T> {
    status: boolean
    message: string
    data: T
}