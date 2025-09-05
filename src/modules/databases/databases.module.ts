import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./databases.module-definition"
import { MongooseModule } from "./mongoose"

@Module({})
export class DatabasesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE = {}
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const mongooseModule = MongooseModule.forRoot({
            isGlobal: options.isGlobal,
        })
        return {
            ...dynamicModule,
            imports: [
                mongooseModule,
            ],
            exports: [
                mongooseModule
            ],
        }
    }
}