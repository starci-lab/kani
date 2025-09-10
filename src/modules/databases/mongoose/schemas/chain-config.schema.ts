import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId, GraphQLTypeTokenType, TokenType } from "@modules/common"

@Schema({ autoCreate: false })
@ObjectType()
export class ChainConfigSchema {
    @Field(() => GraphQLTypeTokenType, { nullable: true })
    @Prop({ type: String, enum: TokenType, required: true })
        farmTokenType: TokenType

    @Field(() => GraphQLTypeChainId, { nullable: true })
    @Prop({ type: String, enum: ChainId, required: true })
        chainId: ChainId    
}

export const ChainConfigSchemaClass = SchemaFactory.createForClass(ChainConfigSchema)   