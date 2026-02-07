import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    ConfigId 
} from "../enums"
import {
    Schema as MongooseSchema 
} from "mongoose"

@Schema({
    timestamps: true,
    collection: "configs",
})
export class ConfigSchema extends AbstractSchema {
    @Prop({
        type: String, required: true, enum: ConfigId 
    })
        displayId: ConfigId

    @Prop({
        type: MongooseSchema.Types.Mixed, required: true 
    })
        value: Record<string, unknown>
}

export const ConfigSchemaClass = SchemaFactory.createForClass(ConfigSchema)