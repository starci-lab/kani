import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./clients.module-definition"
import {
    RpcExecutorService 
} from "./rpc-executor.service"
import {
    SolanaClientService,
    SolanaGetErrorTypesService
} from "./solana"
import {
    SuiClientService,
    SuiGetErrorTypesService
} from "./sui"
import {
    SolanaExecuteService,
    SolanaStimulateService,
    SolanaTxService
} from "./solana"
import {
    SuiExecuteService,
    SuiStimulateService,
    SuiTxService
} from "./sui"

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
            // chain-specific services
            SuiTxService,
            SolanaClientService,
            SolanaGetErrorTypesService,
            SolanaExecuteService,
            SolanaStimulateService,
            SolanaTxService,
            SuiClientService,
            SuiExecuteService,
            SuiStimulateService,
            SuiGetErrorTypesService,
            RpcExecutorService,
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