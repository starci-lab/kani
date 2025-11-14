import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { IsArray, IsEnum, IsUrl } from "class-validator"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "../../abstract"
import {
    ExplorerId,
    GraphQLTypeExplorerId,
    GraphQLTypeLiquidityPoolId,
    GraphQLTypeTokenId,
    LiquidityPoolId,
    TokenId,
} from "@modules/databases"

/**
 * GraphQL input type representing the data required to
 * create a new liquidity provision bot.
 */
@InputType({
    description:
        "Represents the input payload for creating a new bot",
})
export class AddBotRequest {
    /**
     * The blockchain network where this bot will operate.
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
    description:
        "Represents the response data from the addBot mutation",
})
export class AddBotResponseData {
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
        "Represents the response from the addBot mutation",
})
export class AddBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<AddBotResponseData> {
    @Field(() => AddBotResponseData, {
        nullable: true,
        description: "The response data from the addBot mutation",
    })
        data?: AddBotResponseData
}

@InputType({
    description: "Input data required to initialize a bot.",
})
export class InitializeBotRequest {
    @Field(() => ID, {
        description: "The ID of the bot to initialize",
    })
        id: string

    @Field(() => String, {
        description:
            "Human-readable name of the bot, used for identification and management.",
    })
        name: string

    @Field(() => GraphQLTypeTokenId, {
        description:
            "The token that the bot aims to accumulate as the primary outcome of its liquidity strategy.",
    })
        targetTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description:
            "List of liquidity pools where the bot will actively provide and manage liquidity. Must exist in the database.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}

@ObjectType({
    description:
        "Defines the payload returned after successfully initializing a new bot.",
})
export class InitializeBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

@InputType({
    description:
        "Input payload for updating the active liquidity pools managed by a specific bot.",
})
export class UpdateBotLiquidityPoolsRequest {
    @Field(() => ID, {
        description: "Unique identifier of the bot to update.",
    })
        id: string

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description:
            "Array of liquidity pool IDs that the bot should monitor and provide liquidity for. Must exist in the database.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}

@ObjectType({
    description:
        "Response payload returned after successfully updating the bot's assigned liquidity pools.",
})
export class UpdateBotLiquidityPoolsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

@InputType({
    description:
        "Request payload for starting a bot instance.",
})
export class RunBotRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the bot to start running.",
    })
        id: string
}

@ObjectType({
    description:
        "Response payload returned after successfully starting the bot.",
})
export class RunBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to stop a bot.
 */
@InputType({
    description:
        "Request payload for stopping a running liquidity provision bot instance.",
})
export class StopBotRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the liquidity provision bot to stop running.",
    })
        id: string
}

@ObjectType({
    description:
        "Response payload returned after successfully stopping the liquidity provision bot.",
})
export class StopBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to set the RPC endpoints for a bot.
 */
@InputType({
    description:
        "Input payload for updating RPC endpoints used by a liquidity provision bot.",
})
export class UpdateBotRpcsRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the liquidity provision bot to update RPC endpoints for.",
    })
        id: string

    @Field(() => [String], {
        description:
            "An array of RPC URLs that the bot can use for its operations.",
    })
    @IsArray()
    @IsUrl({}, { each: true })
        rpcUrls: Array<string>
}

@ObjectType({
    description:
        "Response payload returned after successfully updating the RPC endpoints of a bot.",
})
export class UpdateBotRpcsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to set the explorer URL provider for a bot.
 */
@InputType({
    description:
        "Input payload for configuring the blockchain explorer integration of a bot.",
})
export class UpdateBotExplorerIdRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the bot to configure explorer for.",
    })
        id: string

    @Field(() => GraphQLTypeExplorerId, {
        description:
            "The explorer id of the bot",
    })
    @IsEnum(ExplorerId)
        explorerId: ExplorerId
}

@ObjectType({
    description:
        "Response payload returned after successfully updating the explorer URL of a bot.",
})
export class UpdateBotExplorerIdResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }
