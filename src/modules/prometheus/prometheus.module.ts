import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./prometheus.module-definition"
import { PromClientService } from "./prom-client.service"

@Module({
    providers: [
        PromClientService,
    ],
    exports: [
        PromClientService,
    ],
})
export class PrometheusModule extends ConfigurableModuleClass {}
