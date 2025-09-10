import { DynamicModule, Module } from "@nestjs/common"
import {
    DexSchema,
    DexSchemaClass,
    InstanceSchema,
    InstanceSchemaClass,
    LiquidityPoolSchema,
    LiquidityPoolSchemaClass,
    SessionSchema,
    SessionSchemaClass,
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
} from "./schemas"
import { MongooseModule as NestMongooseModule } from "@nestjs/mongoose"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./mongoose.module-definition"
import { envConfig } from "@modules/env"
import { Connection } from "mongoose"
import { normalizeMongoose } from "./plugins"
import { MongooseStorageHelpersService } from "./mongoose-storage-helpers.service"
import { SeedersModule } from "./seeders"
import { MemDbModule } from "./memdb"

@Module({})
export class MongooseModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)

        const { dbName, host, password, port, username } =
      envConfig().databases.mongoose
        const url = `mongodb://${username}:${password}@${host}:${port}`

        const extraModules: Array<DynamicModule> = []
        if (options.withSeeders) {
            extraModules.push(
                SeedersModule.register({
                    isGlobal: options.isGlobal,
                }),
            )
        }
        if (options.withMemDb) {
            extraModules.push(
                MemDbModule.register({
                    isGlobal: options.isGlobal,
                }),
            )
        }

        return {
            ...dynamicModule,
            imports: [
                NestMongooseModule.forRoot(url, {
                    retryWrites: true,
                    retryReads: true,
                    authSource: "admin",
                    dbName,
                    connectionFactory: async (connection: Connection) => {
                        connection.plugin(normalizeMongoose)
                        return connection
                    },
                }),
                this.forFeature(),
                ...extraModules,
            ],
            providers: [MongooseStorageHelpersService],
            exports: [MongooseStorageHelpersService, ...extraModules],
        }
    }

    private static forFeature(): DynamicModule {
        return {
            module: MongooseModule,
            imports: [
                NestMongooseModule.forFeatureAsync([
                    {
                        name: StorageSchema.name,
                        useFactory: () => StorageSchemaClass,
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
                        name: UserDepositSchema.name,
                        useFactory: () => UserDepositSchemaClass,
                    },
                    {
                        name: UserCummulativeSchema.name,
                        useFactory: () => UserCummulativeSchemaClass,
                    },  
                ]),
            ],
        }
    }
}
