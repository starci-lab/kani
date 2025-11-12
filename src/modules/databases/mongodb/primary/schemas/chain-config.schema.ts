import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId } from "@modules/common"

@Schema({ autoCreate: false })
@ObjectType()
export class ChainConfigSchema {
    @Field(() => GraphQLTypeChainId, { nullable: true })
    @Prop({ type: String, enum: ChainId, required: true })
        chainId: ChainId    
}

export const ChainConfigSchemaClass = SchemaFactory.createForClass(ChainConfigSchema)   