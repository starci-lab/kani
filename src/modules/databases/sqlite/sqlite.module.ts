import { DynamicModule, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./sqlite.module-definition"
import { envConfig } from "@modules/env"
import { SeedersModule } from "./seeders"
import {
    TokenEntity,
    DexEntity,
    LpPoolEntity,
    UserAllocationEntity,
    UserDepositEntity,
    UserCummulativeEntity,
    UserEntity,
} from "./entities"

@Module({})
export class SqliteModule extends ConfigurableModuleClass {
    public static register(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.register(options)

        const filePath = envConfig().volume.data.path + "/app.db"

        const extraModules: Array<DynamicModule> = []
        if (options.withSeeders) {
            extraModules.push(
                SeedersModule.register({
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
                    LpPoolEntity,
                    UserAllocationEntity,
                    UserDepositEntity,
                    UserCummulativeEntity,
                    UserEntity,
                ]),
                ...extraModules,
            ],
            providers: [],
            exports: [...extraModules],
        }
    }
}
