import { Injectable } from "@nestjs/common"
import { Network, PluginProtocolName } from "@modules/common"
import { InjectMongoose } from "../decorators"
import { StorageSchema } from "../schemas"
import { Connection } from "mongoose"
import { DayjsService } from "@modules/mixin"

export interface GetOrFetchStorageParams<T> {
  action?: () => Promise<T>;
  key: string;
  network: Network;
  protocolName: PluginProtocolName;
  ttlMs?: number; // optional, default = no expiration
}

export interface GetStorageParams {
  key: string;
  network: Network;
  protocolName: PluginProtocolName;
}

export interface UpsertStorageParams<T> {
  key: string;
  network: Network;
  protocolName: PluginProtocolName;
  data: T;
  ttlMs?: number; // optional, default = no expiration
}

export interface UpdateStorageParams<T> {
  key: string;
  protocolName: PluginProtocolName;
  data: T;
  network: Network;
}

@Injectable()
export class MongooseStorageHelpersService {
    constructor(
    @InjectMongoose()
    private readonly connection: Connection,
    private readonly dayjsService: DayjsService,
    ) {}

    public createDisplayId(
        key: string,
        protocolName: PluginProtocolName,
        network: Network,
    ) {
        return `${key}-${protocolName}-${network}`
    }

    async getStorage<T>({
        key,
        protocolName,
        network,
    }: GetStorageParams): Promise<T | null> {
        const storage =  await this.connection
            .model<StorageSchema>(StorageSchema.name)
            .findOne({
                displayId: this.createDisplayId(key, protocolName, network),
            })
        if (!storage) return null 
        return storage.data as T
    }

    // return null if key not found
    async getOrFetchStorage<T>({
        action,
        key,
        protocolName,
        network,
        ttlMs,
    }: GetOrFetchStorageParams<T>): Promise<T | null> {
        const storage = await this.connection
            .model<StorageSchema>(StorageSchema.name)
            .findOne({
                displayId: this.createDisplayId(key, protocolName, network),
            })
        if (storage) {
            return storage.data as T
        }
        if (!action) {
            return null
        }
        const result = await action()
        await this.upsertStorage({
            key,
            network,
            protocolName,
            data: result,
            ttlMs,
        })
        return result
    }

    async upsertStorage<T>({
        key,
        protocolName,
        data,
        ttlMs,
        network,
    }: UpsertStorageParams<T>): Promise<void> {
        await this.connection.model<StorageSchema>(StorageSchema.name).updateOne(
            { displayId: this.createDisplayId(key, protocolName, network) }, // condition
            {
                $set: {
                    data,
                    protocolName,
                    network,
                    expiredAt: ttlMs
                        ? this.dayjsService.now().add(ttlMs, "ms").toDate()
                        : undefined,
                },
            },  
            { upsert: true }, // create or update
        )
    }
}
