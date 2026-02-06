import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    IsBoolean,
    IsString,
} from "class-validator"

/** Base GraphQL response shape (success, message, error). */
@ObjectType({
    isAbstract: true,
    description: "Base response for all GraphQL queries and mutations.",
})
export abstract class AbstractGraphQLResponse {
    @IsBoolean()
    @Field(() => Boolean,
        {
            description: "The success of the response.",
        })
        success: boolean

    @IsString()
    @Field(() => String,
        {
            description: "The message of the response.",
        })
        message: string

    @IsString()
    @Field(() => String,
        {
            nullable: true,
            description: "The error of the response.",
        })
        error?: string
}
