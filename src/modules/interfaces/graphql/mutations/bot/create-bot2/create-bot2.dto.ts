import { GraphQLTypeTokenId, TokenId, GraphQLTypeLiquidityPoolId, LiquidityPoolId } from "@modules/databases"
import { InputType, Field, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeChainId, ChainId } from "@typedefs"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"

@InputType({
    description:
        "Input payload for creating a new bot 2.",
})
export class CreateBot2Request {
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

    @Field(() => GraphQLTypeTokenId, {
        description: "The quote token ID",
    })
        quoteTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        nullable: true,
        description: "List of liquidity pools where the bot will actively provide and manage liquidity. Must exist in the database.",
    })
        liquidityPoolIds?: Array<LiquidityPoolId>

    @Field(() => Boolean, {
        description: "Whether the bot is exiting to USDC",
        defaultValue: false,
    })
        isExitToUsdc: boolean
}

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot.",
})
export class CreateBot2ResponseData {
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
        "Response payload returned after successfully creating a new bot 2.",
})
export class CreateBot2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<CreateBot2ResponseData> {
    @Field(() => CreateBot2ResponseData, {
        nullable: true,
        description: "The response data from the createBot2 mutation",
    })
        data?: CreateBot2ResponseData
}

