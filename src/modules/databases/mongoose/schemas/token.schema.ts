import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, Int, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId, GraphQLTypeNetwork, Network } from "@modules/common"
import { AbstractSchema } from "./abstract"
import { GraphQLTypeTokenId, TokenId } from "../enums"

@Schema({ timestamps: true, collection: "tokens" })
@ObjectType({ description: "Represents a blockchain token with metadata such as symbol, address, decimals, and chain information." })
export class TokenSchema extends AbstractSchema {
    @Field(() => GraphQLTypeTokenId, { description: "Display ID for the token" })
    @Prop({ type: String, required: true, enum: TokenId })
        displayId: TokenId

    @Field(() => String, { description: "Name of the token" })
    @Prop({ type: String, required: true })
        name: string

    @Field(() => String, { description: "Token symbol (e.g. SUI, IKA, USDC)" })
    @Prop({ type: String, required: true })
        symbol: string

    @Field(() => Int, { description: "Number of decimals used for the token" })
    @Prop({ type: Number })
        decimals: number

    @Field(() => String, { description: "Contract address of the token on its chain" })
    @Prop({ type: String, required: true })
        tokenAddress: string

    @Field(() => String, { description: "CoinMarketCap ID of the token, (eg: 'sui', 'solana', 'bitcoin')" })
    @Prop({ type: String, required: true })
        coinMarketCapId: string

    @Field(() => String, { description: "CoinGecko ID of the token (e.g. 'sui', 'solana', 'bitcoin')" })
    @Prop({ type: String, required: true })
        coinGeckoId: string

    @Field(() => String, { description: "URL of the token icon" })
    @Prop({ type: String, required: true })
        iconUrl: string

    @Field(() => GraphQLTypeChainId, { description: "Blockchain network where this token is deployed" })
    @Prop({ type: String, required: true, enum: ChainId })
        chainId: ChainId

    @Field(() => String, { description: "URL of the token project" })
    @Prop({ type: String, required: true })
        projectUrl: string

    @Field(() => GraphQLTypeNetwork, { description: "Network where this token is deployed" })
    @Prop({ type: String, enum: Network, required: true })
        network: Network
}

export const TokenSchemaClass = SchemaFactory.createForClass(TokenSchema)