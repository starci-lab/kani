import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./lp-pools.module-definition"
import { CetusModule } from "./dexes"
import { ClientsModule } from "./clients"
import { DexId } from "@modules/databases"

@Module({})
export class LpPoolsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []

        if (
            !options.dexes 
            || options.dexes.includes(DexId.Cetus)
        ) {
            console.log("Add LP")
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        return {
            ...dynamicModule,
            imports: [
                ClientsModule.register({
                    isGlobal: options.isGlobal
                }),
                ...dexModules,
            ],
            exports: [
                ...dexModules
            ]
        }
    }
}