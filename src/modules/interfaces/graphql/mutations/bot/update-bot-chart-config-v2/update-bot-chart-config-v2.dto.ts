import {
    Field, ID, InputType, ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "../../../abstracts"
import {
    ChartInterval,
    ChartUnit,
    GraphQLTypeChartInterval,
    GraphQLTypeChartUnit,
} from "@modules/databases"

@InputType({
    description: "Input payload for updating bot chart config (v2).",
})
export class UpdateBotChartConfigV2Request {
    @Field(() => ID,
        {
            description: "The ID of the bot whose chart config will be updated.",
        })
        id: string

    @Field(() => GraphQLTypeChartUnit,
        {
            description: "The unit of the chart (usd or target).",
            nullable: true,
        })
        chartUnit?: ChartUnit

    @Field(() => GraphQLTypeChartInterval,
        {
            description: "The interval of the chart.",
            nullable: true,
        })
        chartInterval?: ChartInterval
}

@ObjectType({
    description: "Standard GraphQL response returned after updating bot chart config (v2).",
})
export class UpdateBotChartConfigV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
