import { DynamicModule, Module } from "@nestjs/common"
import {
    DexSchema,
    DexSchemaClass,
    InstanceSchema,
    InstanceSchemaClass,
    LiquidityPoolSchema,
    LiquidityPoolSchemaClass,
    StorageSchema,
    StorageSchemaClass,
    TokenSchema,
    TokenSchemaClass,
    UserAllocationSchema,
    UserAllocationSchemaClass,
    UserCummulativeSchema,
    UserCummulativeSchemaClass,
    UserDepositSchema,
    UserDepositSchemaClass,
    UserSchema,
    UserSchemaClass,
    UserWalletSchema,
    UserWalletSchemaClass,
    ChainConfigSchema,
    ChainConfigSchemaClass,
    WalletSchema,
    WalletSchemaClass,
    SessionSchema,
    SessionSchemaClass,
    BotSchema,
    BotSchemaClass,
    ConfigSchema,
    ConfigSchemaClass,
    SwapTransactionSchema,
    SwapTransactionSchemaClass,
    PositionSchema,
    PositionSchemaClass,
} from "./schemas"
import { MongooseModule as NestMongooseModule } from "@nestjs/mongoose"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./mongodb.module-definition"
import { envConfig } from "@modules/env"
import { Connection } from "mongoose"
import { SeedersModule } from "./seeders"
import { MemoryModule } from "./memory"
import { CONNECTION_NAME } from "./constants"
import { normalizeMongoose } from "../plugins"
import { PrimaryMongooseObserverService } from "./observer.service"

@Module({})
export class PrimaryMongoDbModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)

        const { dbName, host, password, port, username } =
      envConfig().databases.mongoose.primary
        const url = `mongodb://${username}:${password}@${host}:${port}`

        const extraModules: Array<DynamicModule> = []
        // If withSeeders is a boolean, use it as the manualSeed value
        if (
            typeof options.withSeeders === "undefined" 
            || options.withSeeders
        ) {
            extraModules.push(
                SeedersModule.register({
                    isGlobal: options.isGlobal,
                    manualSeed: !(typeof options.withSeeders === "object" ? options.withSeeders.manualSeed : true),
                }),
            )
        }
        // If memoryStorage is a boolean, use it as the manualLoad value
        if (
            typeof options.memoryStorage === "undefined" 
            || options.memoryStorage
        ) {
            extraModules.push(
                MemoryModule.register({
                    isGlobal: options.isGlobal,
                    manualLoad: !(typeof options.memoryStorage === "object" ? options.memoryStorage.manualLoad : true),
                }),
            )
        }
        // If mongoose is a boolean, use it as the connectionFactory value
        return {
            ...dynamicModule,
            imports: [
                NestMongooseModule.forRoot(url, {
                    retryWrites: true,
                    retryReads: true,
                    authSource: "admin",
                    dbName,
                    connectionName: CONNECTION_NAME,
                    connectionFactory: async (connection: Connection) => {
                        connection.plugin(normalizeMongoose)
                        connection.set("writeConcern", {
                            w: "majority",
                            j: true,
                        })
                        return connection
                    },
                }),
                this.forFeature(),
                ...extraModules,
            ],
            providers: [
                PrimaryMongooseObserverService
            ],
            exports: [
                ...extraModules, 
                PrimaryMongooseObserverService
            ],
        }
    }

    private static forFeature(): DynamicModule {
        return {
            module: PrimaryMongoDbModule,
            imports: [
                NestMongooseModule.forFeatureAsync([
                    {
                        name: StorageSchema.name,
                        useFactory: () => StorageSchemaClass,
                    },
                    {
                        name: BotSchema.name,
                        useFactory: () => BotSchemaClass,
                    },
                    {
                        name: UserSchema.name,
                        useFactory: () => UserSchemaClass,
                    },
                    {
                        name: WalletSchema.name,
                        useFactory: () => WalletSchemaClass,
                    },
                    {
                        name: UserWalletSchema.name,
                        useFactory: () => UserWalletSchemaClass,
                    },
                    {
                        name: ChainConfigSchema.name,
                        useFactory: () => ChainConfigSchemaClass,
                    },
                    {
                        name: SessionSchema.name,
                        useFactory: () => SessionSchemaClass,
                    },
                    {
                        name: TokenSchema.name,
                        useFactory: () => TokenSchemaClass,
                    },
                    {
                        name: DexSchema.name,
                        useFactory: () => DexSchemaClass,
                    },
                    {
                        name: LiquidityPoolSchema.name,
                        useFactory: () => LiquidityPoolSchemaClass,
                    },
                    {
                        name: InstanceSchema.name,
                        useFactory: () => InstanceSchemaClass,
                    },
                    {
                        name: UserAllocationSchema.name,
                        useFactory: () => UserAllocationSchemaClass,
                    },
                    {
                        name: PositionSchema.name,
                        useFactory: () => PositionSchemaClass,
                    },
                    {
                        name: UserDepositSchema.name,
                        useFactory: () => UserDepositSchemaClass,
                    },
                    {
                        name: UserCummulativeSchema.name,
                        useFactory: () => UserCummulativeSchemaClass,
                    },  
                    {
                        name: ConfigSchema.name,
                        useFactory: () => ConfigSchemaClass,
                    },
                    {
                        name: SwapTransactionSchema.name,
                        useFactory: () => SwapTransactionSchemaClass,
                    },
                ], CONNECTION_NAME),
            ],
        }
    }
}
