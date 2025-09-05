import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql"

@Schema({ autoCreate: false })
@ObjectType()
export class SessionSchema {
    @Field(() => String)
    @Prop({ type: String, required: true })
        refreshToken: string

    @Field(() => Date)
    @Prop({ type: Date })
        expiredAt: Date
}

export const SessionSchemaClass = SchemaFactory.createForClass(SessionSchema)