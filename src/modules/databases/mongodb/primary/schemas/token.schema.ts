import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    Field, Int, ObjectType 
} from "@nestjs/graphql"
import {
    ChainId, GraphQLTypeChainId, GraphQLTypeTokenType, TokenType
} from "@modules/common"
import {
    AbstractSchema 
} from "./abstract"
import {
    GraphQLTypeTokenId, TokenId 
} from "../enums"
import {
    MarketListingSchema 
} from "./market-listing.schema"

@Schema({
    timestamps: true, collection: "tokens" 
})
@ObjectType({
    description: "Represents a blockchain token with metadata such as symbol, address, decimals, and chain information." 
})
export class TokenSchema extends AbstractSchema {
    @Field(() => GraphQLTypeTokenId,
        {
            description: "Display ID for the token" 
        })
    @Prop({
        type: String, required: true, enum: TokenId 
    })
        displayId: TokenId

    @Field(() => String,
        {
            description: "Name of the token" 
        })
    @Prop({
        type: String, required: true 
    })
        name: string

    @Field(() => String,
        {
            description: "Token symbol (e.g. SUI, IKA, USDC)" 
        })
    @Prop({
        type: String, required: true 
    })
        symbol: string

    @Field(() => Int,
        {
            description: "Number of decimals used for the token" 
        })
    @Prop({
        type: Number 
    })
        decimals: number

    @Field(() => String,
        {
            description: "Contract address of the token on its chain", nullable: true 
        })
    @Prop({
        type: String, nullable: true 
    })
        tokenAddress: string

    @Field(() => String,
        {
            description: "URL of the token icon" 
        })
    @Prop({
        type: String, required: true 
    })
        iconUrl: string

    @Field(() => GraphQLTypeChainId,
        {
            description: "Blockchain network where this token is deployed" 
        })
    @Prop({
        type: String, required: true, enum: ChainId 
    })
        chainId: ChainId

    @Field(() => String,
        {
            description: "URL of the token project" 
        })
    @Prop({
        type: String, required: true 
    })
        projectUrl: string

    @Field(() => GraphQLTypeTokenType,
        {
            description: "Type of the token" 
        })
    @Prop({
        type: String, enum: TokenType, required: true 
    })
        type: TokenType

    @Field(() => Boolean,
        {
            description: "Whether the token is selectable for liquidity yield farming"
        })
    @Prop({
        type: Boolean, required: true 
    })
        selectable: boolean

    // only valid for solana tokens
    @Field(() => Boolean,
        {
            description: "Whether the token is a 2022 token", nullable: true 
        })
    @Prop({
        type: Boolean, required: false 
    })
        is2022Token?: boolean

    @Field(() => [MarketListingSchema],
        {
            description: "List of markets where the token is listed" 
        })
    @Prop({
        type: [MarketListingSchema], required: true 
    })
        marketListings: Array<MarketListingSchema>
}

export const TokenSchemaClass = SchemaFactory.createForClass(TokenSchema)