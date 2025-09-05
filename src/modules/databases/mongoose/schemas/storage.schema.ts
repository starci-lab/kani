import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { SchemaTypes } from "mongoose"
import { Network, PluginProtocolName } from "@modules/common"

@Schema({
    timestamps: true,
    collection: "storages",
})
export class StorageSchema extends AbstractSchema {
    @Prop({
        unique: true,
        type: String,
        required: true,
    })
        displayId: string

    @Prop({
        type: String,
        enum: Network,
        required: true,
        default: Network.Mainnet,
    })
        network: Network

    @Prop({
        type: String,
        required: true,
        enum: PluginProtocolName,
    })
        protocolName: PluginProtocolName

    @Prop({
        type: SchemaTypes.Mixed,
        required: true,
    })
        data: Record<string, unknown>
}

export const StorageSchemaClass = SchemaFactory.createForClass(StorageSchema)
