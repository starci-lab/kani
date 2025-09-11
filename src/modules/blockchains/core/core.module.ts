import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./core.module-definition"
import { CetusModule, TurbosModule } from "./dexes"
import { ClientsModule } from "./clients"
import { DexId } from "@modules/databases"
import { LiquidityPoolService } from "./core.service"
import { SwapModule } from "./swap"
import { MixinModule } from "@modules/mixin"
import { UtilsModule } from "./utils"
import { WinstonLevel, WinstonLogType, WinstonModule } from "@modules/winston"
import { EnvModule } from "@modules/env"
import { SignersModule } from "./signers"
import { CryptoModule } from "@modules/crypto"

@Module({})
export class BlockchainCoreModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []
        const providers: Array<Provider> = [
            LiquidityPoolService
        ]
        if (
            !options.dexes 
            || options.dexes.includes(DexId.Cetus)
        ) {
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes 
            || options.dexes.includes(DexId.Turbos)
        ) {
            dexModules.push(TurbosModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        const extraImports: Array<DynamicModule> = []
        if (options.useSelfImports) {
            extraImports.push(
                EnvModule.forRoot(),
                MixinModule.register({
                    isGlobal: options.isGlobal,
                }),
                CryptoModule.register({
                    isGlobal: options.isGlobal,
                }),
                WinstonModule.register({
                    isGlobal: options.isGlobal,
                    logTypes: [WinstonLogType.Console],
                    appName: "liquidity-pools",
                    level: WinstonLevel.Debug,
                }),
            )
        }

        return {
            ...dynamicModule,
            imports: [
                ...extraImports,
                ClientsModule.register({
                    isGlobal: options.isGlobal
                }),
                SwapModule.register({
                    isGlobal: options.isGlobal,
                }),
                UtilsModule.register({
                    isGlobal: options.isGlobal,
                }),
                SignersModule.register({
                    isGlobal: options.isGlobal,
                    useGcpKms: options.useGcpKms,
                }),
                ...dexModules,
            ],
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...dexModules,
                ...providers,
            ]
        }
    }
}