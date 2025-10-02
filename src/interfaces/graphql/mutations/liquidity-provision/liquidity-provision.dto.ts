import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { IsEnum } from "class-validator"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"
import { GraphQLTypeLiquidityPoolId, GraphQLTypeTokenId, LiquidityPoolId, TokenId } from "@modules/databases/enums"

/**
 * GraphQL input type representing the data required to
 * create a new liquidity provision bot.
 */
@InputType({
    description: "Represents the input payload for creating a new liquidity provision bot"
})
export class AddLiquidityProvisionBotRequest {
    /**
     * The blockchain network where this liquidity provision bot will operate.
     * Determines which on-chain protocol and RPC endpoint the bot will use.
     */
    @Field(() => GraphQLTypeChainId, {
        description: "The blockchain network where the bot will operate",
        defaultValue: ChainId.Sui,
    })
    @IsEnum(ChainId)
        chainId: ChainId
}

@ObjectType({
    description: "Represents the response data from the addLiquidityProvisionBot mutation"
})
export class AddLiquidityProvisionBotResponseData {
    @Field(() => String, {
        description: "The ID of the liquidity provision bot"
    })
        id: string

    @Field(() => String, {
        description: "The account address of the wallet"
    })
        accountAddress: string
}

@ObjectType({
    description: "Represents the response from the addLiquidityProvisionBot mutation"
})
export class AddLiquidityProvisionBotResponse 
    extends AbstractGraphQLResponse 
    implements IAbstractGraphQLResponse<AddLiquidityProvisionBotResponseData> {
    @Field(() => AddLiquidityProvisionBotResponseData, {
        nullable: true,
        description: "The response data from the addLiquidityProvisionBot mutation"
    })
        data?: AddLiquidityProvisionBotResponseData
}

@InputType({
    description: "Input data required to initialize a liquidity provision bot.",
})
export class InitializeLiquidityProvisionBotRequest {
    @Field(() => ID, {
        description: "The ID of the liquidity provision bot to initialize",
    })
        id: string

    @Field(() => String, {
        description: "Human-readable name of the bot, used for identification and management",
    })
        name: string

    @Field(() => GraphQLTypeTokenId, {
        description: "The token that the bot will prioritize when managing liquidity positions",
    })
        priorityTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description: "List of liquidity pools where the bot will actively provide and manage liquidity.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}

@ObjectType({
    description: "Defines the payload returned after successfully initializing a new liquidity provision bot.",
})
export class InitializeLiquidityProvisionBotResponse 
    extends AbstractGraphQLResponse 
    implements IAbstractGraphQLResponse {}