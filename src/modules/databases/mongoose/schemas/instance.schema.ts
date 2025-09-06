import { Field } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { UserAllocationSchema } from "./user-allocation.schema"

@Schema({
    timestamps: true,
    collection: "instances",
})
export class InstanceSchema extends AbstractSchema {
    @Field(() => String, { description: "The instance id" })
    @Prop({ type: String, required: true })
        instanceId: string

    // limit 100 users per docker instance
    @Field(() => [UserAllocationSchema], { description: "List of user allocations to this instance" })
    @Prop({ type: [UserAllocationSchema], required: true })
        userAllocations: Array<UserAllocationSchema>    
}

export const InstanceSchemaClass = SchemaFactory.createForClass(InstanceSchema)