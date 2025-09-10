import { DynamicModule, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./sqlite.module-definition"
import { envConfig } from "@modules/env"
import { SqliteSeedersModule } from "./seeders"
import {
    TokenEntity,
    DexEntity,
    LiquidityPoolEntity,
    UserDepositEntity,
    UserCummulativeEntity,
    UserEntity,
    AssignedLiquidityPoolEntity,
    WalletEntity,   
    AddedLiquidityPoolEntity,
    AddedLiquidityPoolHistoryEntity,
    ChainConfigEntity,
} from "./entities"
import { join } from "path"

@Module({})
export class SqliteModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)
        const filePath = join(envConfig().volume.data.path, "db.sqlite")
        const extraModules: Array<DynamicModule> = []
        if (options.withSeeders) {
            extraModules.push(
                SqliteSeedersModule.register({
                    isGlobal: options.isGlobal,
                }),
            )
        }

        return {
            ...dynamicModule,
            imports: [
                TypeOrmModule.forRoot({
                    type: "sqlite",
                    database: filePath,
                    autoLoadEntities: true,
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([
                    TokenEntity,
                    DexEntity,
                    LiquidityPoolEntity,
                    UserDepositEntity,
                    UserCummulativeEntity,
                    UserEntity,
                    AssignedLiquidityPoolEntity,
                    WalletEntity,
                    AddedLiquidityPoolEntity,
                    AddedLiquidityPoolHistoryEntity,
                    ChainConfigEntity,
                ]),
                ...extraModules,
            ],
            providers: [],
            exports: [...extraModules],
        }
    }
}
