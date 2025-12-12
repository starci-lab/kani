import { GraphQLTypeTokenId, TokenId, GraphQLTypeLiquidityPoolId, LiquidityPoolId } from "@modules/databases"
import { InputType, Field, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeChainId, ChainId } from "@typedefs"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"

@InputType({
    description:
        "Input payload for updating the bot's name.",
})
export class CreateBotRequest {
    @Field(() => String, {
        description: "The new name of the bot.",
    })
        name: string

    @Field(() => GraphQLTypeChainId, {
        description: "The blockchain network where the bot will operate",
    })
        chainId: ChainId

    @Field(() => GraphQLTypeTokenId, {
        description: "The token that the bot aims to accumulate as the primary outcome of its liquidity strategy.",
    })
        targetTokenId: TokenId

    @Field(() => [String], {
        description: "The RPC URLs of the bot",
    })
        quoteTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        nullable: true,
        description: "List of liquidity pools where the bot will actively provide and manage liquidity. Must exist in the database.",
    })
        liquidityPoolIds?: Array<LiquidityPoolId>
}

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot.",
})
export class CreateBotResponseData {
    @Field(() => String, {
        description: "The ID of the bot",
    })
        id: string

    @Field(() => String, {
        description: "The account address of the wallet",
    })
        accountAddress: string
}

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot.",
})
export class CreateBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<CreateBotResponseData> {
    @Field(() => CreateBotResponseData, {
        nullable: true,
        description: "The response data from the createBot mutation",
    })
        data?: CreateBotResponseData
}