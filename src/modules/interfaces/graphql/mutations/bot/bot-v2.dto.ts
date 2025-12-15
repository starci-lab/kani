import { GraphQLTypeTokenId, TokenId, GraphQLTypeLiquidityPoolId, LiquidityPoolId } from "@modules/databases"
import { InputType, Field, ObjectType, ID } from "@nestjs/graphql"
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

@InputType({
    description: "Input payload for exporting a bot's private key.",
})
export class BackupBotPrivateKeyRequest {
    @Field(() => ID, {
        description: "The ID of the bot to backup the private key for.",
    })
        botId: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key.",
})
export class BackupBotPrivateKeyResponseData {
    @Field(() => String, {
        description: "The private key of the bot",
    })
        privateKey: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key.",
})
export class BackupBotPrivateKeyResponse 
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BackupBotPrivateKeyResponseData> {
    @Field(() => BackupBotPrivateKeyResponseData, {
        nullable: true,
        description: "The response data from the backupBotPrivateKey mutation",
    })
        data?: BackupBotPrivateKeyResponseData
}