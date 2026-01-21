import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    DexSchema,
    DexSchemaClass,
    LiquidityPoolSchema,
    LiquidityPoolSchemaClass,
    TokenSchema,
    TokenSchemaClass,
    UserSchema,
    UserSchemaClass,
    SessionSchema,
    SessionSchemaClass,
    BotSchema,
    BotSchemaClass,
    ConfigSchema,
    ConfigSchemaClass,
    StateSchema,
    StateSchemaClass,
    TransactionSchema,
    TransactionSchemaClass,
    PositionSchema,
    PositionSchemaClass,
    ExecutorSchema,
    ExecutorSchemaClass,
    AssignedBotSchemaClass,
    AssignedBotSchema,
    JobSchema,
    JobSchemaClass,
    HistorySchema,
    HistorySchemaClass,
    HistorySerieSchema,
    HistorySerieSchemaClass,
    MarketListingSchema,
    MarketListingSchemaClass,
    BotActivePositionSchemaClass,
    BotActivePositionSchema,
    PrivyMetadataSchemaClass,
    PrivyMetadataSchema,
    BotSnapshotsSchemaClass,
    BotSnapshotsSchema,
    PositionSettlementSchema,
    PositionSettlementSchemaClass,
    PositionSnapshotsSchemaClass,
    PositionSnapshotsSchema,
    PositionFeesSchemaClass,
    PositionFeesSchema,
    LiquidityPoolClmmStateSchemaClass,
    LiquidityPoolClmmStateSchema,
    LiquidityPoolDlmmStateSchemaClass,
    LiquidityPoolDlmmStateSchema,
    PositionClmmStateSchemaClass,
    PositionClmmStateSchema,
    PositionDlmmStateSchemaClass,
    PositionDlmmStateSchema,
} from "./schemas"
import {
    MongooseModule as NestMongooseModule 
} from "@nestjs/mongoose"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./mongodb.module-definition"
import {
    envConfig 
} from "@modules/env"
import {
    Connection 
} from "mongoose"
import {
    SeedersModule 
} from "./seeders"
import {
    MemoryModule 
} from "./memory"
import {
    CONNECTION_NAME 
} from "./constants"
import {
    normalizeMongoose 
} from "../plugins"

@Module({
})
export class PrimaryMongoDbModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {
    }): DynamicModule {
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
                SeedersModule.register(
                    {
                        isGlobal: options.isGlobal,
                        manualSeed: !(typeof options.withSeeders === "object" ? options.withSeeders.manualSeed : true),
                    }
                ),
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
                NestMongooseModule.forRoot(url,
                    {
                        retryWrites: true,
                        retryReads: true,
                        authSource: "admin",
                        dbName,
                        connectionName: CONNECTION_NAME,
                        connectionFactory: async (connection: Connection) => {
                            connection.plugin(normalizeMongoose)
                            connection.set("writeConcern",
                                {
                                    w: "majority",
                                    j: true,
                                })
                            return connection
                        },
                    }),
                this.forFeature(),
                ...extraModules,
            ],
            exports: [
                ...extraModules, 
            ],
        }
    }

    private static forFeature(): DynamicModule {
        return {
            module: PrimaryMongoDbModule,
            imports: [
                NestMongooseModule.forFeatureAsync([
                    {
                        name: BotSchema.name,
                        useFactory: () => BotSchemaClass,
                    },
                    {
                        name: UserSchema.name,
                        useFactory: () => UserSchemaClass,
                    },
                    {
                        name: ExecutorSchema.name,
                        useFactory: () => ExecutorSchemaClass,
                    },
                    {
                        name: AssignedBotSchema.name,
                        useFactory: () => AssignedBotSchemaClass,
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
                        name: PositionSchema.name,
                        useFactory: () => PositionSchemaClass,
                    },
                    {
                        name: PositionSettlementSchema.name,
                        useFactory: () => PositionSettlementSchemaClass,
                    },
                    {
                        name: ConfigSchema.name,
                        useFactory: () => ConfigSchemaClass,
                    },
                    {
                        name: TransactionSchema.name,
                        useFactory: () => TransactionSchemaClass,
                    },
                    {
                        name: StateSchema.name,
                        useFactory: () => StateSchemaClass,
                    },
                    {
                        name: JobSchema.name,
                        useFactory: () => JobSchemaClass,
                    },
                    {
                        name: HistorySchema.name,
                        useFactory: () => HistorySchemaClass,
                    },
                    {
                        name: HistorySerieSchema.name,
                        useFactory: () => HistorySerieSchemaClass,
                    },
                    {
                        name: MarketListingSchema.name,
                        useFactory: () => MarketListingSchemaClass,
                    },
                    {
                        name: PrivyMetadataSchema.name,
                        useFactory: () => PrivyMetadataSchemaClass,
                    },
                    {
                        name: BotActivePositionSchema.name,
                        useFactory: () => BotActivePositionSchemaClass,
                    },
                    {
                        name: BotSnapshotsSchema.name,
                        useFactory: () => BotSnapshotsSchemaClass,
                    },
                    {
                        name: PositionSnapshotsSchema.name,
                        useFactory: () => PositionSnapshotsSchemaClass,
                    },
                    {
                        name: PositionFeesSchema.name,
                        useFactory: () => PositionFeesSchemaClass,
                    },
                    {
                        name: LiquidityPoolClmmStateSchema.name,
                        useFactory: () => LiquidityPoolClmmStateSchemaClass,
                    },
                    {
                        name: LiquidityPoolDlmmStateSchema.name,
                        useFactory: () => LiquidityPoolDlmmStateSchemaClass,
                    },
                    {
                        name: PositionClmmStateSchema.name,
                        useFactory: () => PositionClmmStateSchemaClass,
                    },
                    {
                        name: PositionDlmmStateSchema.name,
                        useFactory: () => PositionDlmmStateSchemaClass,
                    },
                ],
                CONNECTION_NAME),
            ],
        }
    }
}
