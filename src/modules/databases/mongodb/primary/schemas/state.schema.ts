import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    StateId 
} from "../enums"
import {
    Schema as MongooseSchema 
} from "mongoose"

@Schema({
    timestamps: true,
    collection: "states",
})
export class StateSchema extends AbstractSchema {
    @Prop({
        type: String, required: true, enum: StateId 
    })
        displayId: StateId

    @Prop({
        type: MongooseSchema.Types.Mixed, required: true 
    })
        value: Record<string, unknown>
}

export const StateSchemaClass = SchemaFactory.createForClass(StateSchema)