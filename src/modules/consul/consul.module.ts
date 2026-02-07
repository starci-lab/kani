import {
    DynamicModule,
    Module,
    Provider,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./consul.module-definition"
import {
    AxiosModule,
} from "@modules/axios"
import {
    ConsulRegisterService,
} from "./consul-register.service"
import {
    ConsulKvService,
} from "./consul-kv.service"
import {
    RegisterPrometheusDnsService,
} from "./register-prometheus-dns.service"

/**
 * Consul module. Provides ConsulRegisterService (agent, health, status) and ConsulKvService (KV).
 * When enablePrometheusDnsDiscovery is set, also provides RegisterPrometheusDnsService.
 *
 * @example
 * ConsulModule.register({
 *   serviceName: ServiceName.KaniExecutor,
 *   enablePrometheusDnsDiscovery: true,
 *   id: "1",
 *   port: 3003,
 *   address: "127.0.0.1",
 *   isGlobal: true,
 * })
 */
@Module({
})
export class ConsulModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        // register providers
        const providers: Array<Provider> = [
            ...(dynamicModule.providers || []),
            ConsulRegisterService,
            ConsulKvService,
        ]
        // register RegisterDnsService if executorDns is set
        if (options.enablePrometheusDnsDiscovery) {
            providers.push(RegisterPrometheusDnsService)
        }
        // register exports
        return {
            ...dynamicModule,
            imports: [
                ...(dynamicModule.imports || []),
                AxiosModule.register({
                    isGlobal: false,
                }),
            ],
            providers,
            exports: [
                ConsulRegisterService,
                ConsulKvService
            ],
        }
    }
}
