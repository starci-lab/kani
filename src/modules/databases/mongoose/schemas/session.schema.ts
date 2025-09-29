import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID } from "@nestjs/graphql"
import { UserSchema } from "./user.schema"
import { Schema as MongooseSchema, Types } from "mongoose"

@Schema({
    timestamps: true,
    collection: "sessions",
})
export class SessionSchema extends AbstractSchema {
    @Prop({ type: String, required: true })
        sessionId: string

    @Field(() => ID, { description: "The user who owns the session" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserSchema.name })
        user: UserSchema | Types.ObjectId

    // expiresAt is the date and time when the session will expire
    @Prop({ type: Date, required: true })
        expiresAt: Date
}

export const SessionSchemaClass = SchemaFactory.createForClass(SessionSchema)   