
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE
} from "./local.module-definition"
import { ConfigModule } from "@nestjs/config"
import { KeyModule } from "./key"
import { envConfig } from "@modules/env"
@Module({})
export class LocalModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE = {}) {
        const dynamicModule = super.register(options)
        const isProduction = envConfig().isProduction
        const modules = isProduction ? [] : [
            KeyModule.register({
                isGlobal: options.isGlobal,
            })
        ]
        return {
            ...dynamicModule,
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                }),
                ...modules,
            ]
        }
    }
}
