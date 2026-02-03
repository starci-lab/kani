import {
    Field, ID, InputType, ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "../../../abstracts"

@InputType({
    description: "Input payload for withdrawing from a bot.",
})
export class WithdrawRequest {
    @Field(() => ID,
        {
            description: "The ID of the bot to withdraw from.",
        })
        id: string
}

@ObjectType({
    description: "Standard GraphQL response returned after withdrawing from a bot.",
})
export class WithdrawResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
