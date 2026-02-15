import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./clients.module-definition"
import {
    SolanaExecuteService,
    SolanaStimulateService,
    SolanaTxService,
    SolanaFetchService,
} from "./solana"
import {
    SuiExecuteService,
    SuiFetchService,
    SuiStimulateService,
    SuiTxService,
} from "./sui"
import {
    RpcExecutorService,
    SuiGetErrorTypesService,
    SolanaGetErrorTypesService,
    SolanaClientService,
    SuiClientService,
} from "./rpc"

/**
 * Module for managing blockchain RPC clients.
 * Provides services for executing RPC calls with retry logic and error handling.
 *
 * @example
 * ClientsModule.register({ isGlobal: true })
 */
@Module({
})
export class ClientsModule extends ConfigurableModuleClass {
    /**
     * Registers the clients module with all required services.
     *
     * @param options - Module configuration options
     * @returns Dynamic module with client services
     *
     * @example
     * const module = ClientsModule.register({ isGlobal: true })
     */
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
  
        // register all client services
        const providers: Array<Provider> = [
            RpcExecutorService,
            SolanaFetchService,
            SolanaGetErrorTypesService,
            SuiFetchService,
            SuiGetErrorTypesService,
            SolanaClientService,
            SuiClientService,
            // chain-specific services
            ...(
                options.disableExtensions ? [] : [
                    SolanaExecuteService,
                    SuiExecuteService,
                    SuiStimulateService,
                    SuiTxService,
                    SolanaStimulateService,
                    SolanaTxService,
                ]
            ),
        ]
        
        return {
            ...dynamicModule,
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...providers,
            ],
        }
    }
}