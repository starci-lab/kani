import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { IsEnum } from "class-validator"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"

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