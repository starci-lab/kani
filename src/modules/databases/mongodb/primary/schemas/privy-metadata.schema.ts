import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"

@ObjectType({
    description: "Represents the metadata of a privy wallet",
})
@Schema({
    autoCreate: false,
})
export class PrivyMetadataSchema extends AbstractSchema {
    @Field(() => String,
        {
            description: "The privy wallet id" 
        })
    @Prop({
        type: String, required: true 
    })
        walletId: string

    @Field(() => String,
        {
            description: "The privy signer public key" 
        })
    @Prop({
        type: String, required: false 
    })
        signerPublicKey?: string

    @Field(() => String,
        {
            description: "The privy wallet public key" 
        })
    @Prop({
        type: String, required: false 
    })
        walletPublicKey?: string
}

export const PrivyMetadataSchemaClass = SchemaFactory.createForClass(PrivyMetadataSchema)