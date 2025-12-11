import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, Float, Int, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId, GraphQLTypeTokenType, TokenType } from "@typedefs"
import { AbstractSchema } from "./abstract"
import { CexId, GraphQLTypeCexId, GraphQLTypeTokenId, TokenId } from "../enums"
import GraphQLJSON from "graphql-type-json"

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

    @Field(() => String, { description: "Contract address of the token on its chain", nullable: true })
    @Prop({ type: String, nullable: true })
        tokenAddress: string

    @Field(() => String, { 
        description: "CoinMarketCap ID of the token, (eg: 'sui', 'solana', 'bitcoin')",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        coinMarketCapId?: string

    @Field(() => String, { 
        description: "CoinGecko ID of the token (e.g. 'sui', 'solana', 'bitcoin')",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        coinGeckoId?: string

    @Field(() => String, { description: "URL of the token icon" })
    @Prop({ type: String, required: true })
        iconUrl: string

    @Field(() => GraphQLTypeChainId, { description: "Blockchain network where this token is deployed" })
    @Prop({ type: String, required: true, enum: ChainId })
        chainId: ChainId

    @Field(() => String, { description: "URL of the token project" })
    @Prop({ type: String, required: true })
        projectUrl: string

    @Field(() => [GraphQLTypeCexId], { description: "List of CEXs where the token is listed", nullable: true })
    @Prop({ type: [String], enum: CexId, required: false })
        cexIds?: Array<CexId>

    @Field(() => GraphQLTypeCexId, { description: "Primary CEX where the token is listed", nullable: true })
    @Prop({ type: String, enum: CexId, required: false })
        whichCex?: CexId

    @Field(() => GraphQLJSON, { description: "CEX trading symbols map (CexId -> symbol)", nullable: true })
    @Prop({ type: Map, of: String, default: {} })
        cexSymbols?: Record<string, string>

    @Field(() => GraphQLTypeTokenType, { description: "Type of the token" })
    @Prop({ type: String, enum: TokenType, required: true })
        type: TokenType

    @Field(() => String, { description: "Pyth feed ID of the token", nullable: true })
    @Prop({ type: String, required: false })
        pythFeedId?: string

    @Field(() => Boolean, { description: "Whether the token is selectable for liquidity yield farming"})
    @Prop({ type: Boolean, required: true })
        selectable: boolean

    // only valid for solana tokens
    @Field(() => Boolean, { description: "Whether the token is a 2022 token", nullable: true })
    @Prop({ type: Boolean, required: false })
        is2022Token?: boolean

    @Field(() => Float, { 
        description: "The minimum required amount of the token in total to be eligible for the bot",
        nullable: true,
    })
    @Prop({ type: Number, required: false })
        minRequiredAmountInTotal?: number
}

export const TokenSchemaClass = SchemaFactory.createForClass(TokenSchema)