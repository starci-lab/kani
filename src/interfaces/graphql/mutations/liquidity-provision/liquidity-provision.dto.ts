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
        "Represents the input payload for creating a new liquidity provision bot",
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
    description:
        "Represents the response data from the addLiquidityProvisionBot mutation",
})
export class AddLiquidityProvisionBotResponseData {
    @Field(() => String, {
        description: "The ID of the liquidity provision bot",
    })
        id: string

    @Field(() => String, {
        description: "The account address of the wallet",
    })
        accountAddress: string
}

@ObjectType({
    description:
        "Represents the response from the addLiquidityProvisionBot mutation",
})
export class AddLiquidityProvisionBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<AddLiquidityProvisionBotResponseData> {
    @Field(() => AddLiquidityProvisionBotResponseData, {
        nullable: true,
        description: "The response data from the addLiquidityProvisionBot mutation",
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
        description:
            "Human-readable name of the bot, used for identification and management",
    })
        name: string

    @Field(() => GraphQLTypeTokenId, {
        description:
            "The token that the bot will prioritize when managing liquidity positions",
    })
        priorityTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description:
            "List of liquidity pools where the bot will actively provide and manage liquidity.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}

@ObjectType({
    description:
        "Defines the payload returned after successfully initializing a new liquidity provision bot.",
})
export class InitializeLiquidityProvisionBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

@InputType({
    description:
        "Input payload for updating the active liquidity pools managed by a specific liquidity provision bot.",
})
export class UpdateLiquidityProvisionBotLiquidityPoolsRequest {
    @Field(() => ID, {
        description: "Unique identifier of the liquidity provision bot to update.",
    })
        id: string

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description:
            "Array of liquidity pool IDs that the bot should monitor and provide liquidity for.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}

@ObjectType({
    description:
        "Response payload returned after successfully updating the bot’s assigned liquidity pools.",
})
export class UpdateLiquidityProvisionBotLiquidityPoolsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

@InputType({
    description:
        "Request payload for starting a liquidity provision bot instance.",
})
export class RunLiquidityProvisionBotRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the liquidity provision bot to start running.",
    })
        id: string
}

@ObjectType({
    description:
        "Response payload returned after successfully starting the liquidity provision bot.",
})
export class RunLiquidityProvisionBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to stop a liquidity provision bot.
 */
@InputType({
    description:
        "Request payload for stopping a running liquidity provision bot instance.",
})
export class StopLiquidityProvisionBotRequest {
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
export class StopLiquidityProvisionBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to set the RPC endpoints for a liquidity provision bot.
 */
@InputType({
    description:
        "Input payload for updating RPC endpoints used by a liquidity provision bot.",
})
export class UpdateLiquidityProvisionBotRpcsRequest {
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
export class UpdateLiquidityProvisionBotRpcsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }

/**
 * Represents the request to set the explorer URL provider for a bot.
 */
@InputType({
    description:
        "Input payload for configuring the blockchain explorer integration of a bot.",
})
export class UpdateLiquidityProvisionBotExplorerIdRequest {
    @Field(() => ID, {
        description:
            "The unique ID of the liquidity provision bot to configure explorer for.",
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
export class UpdateLiquidityProvisionBotExplorerIdResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse { }
