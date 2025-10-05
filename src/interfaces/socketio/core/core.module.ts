import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./core.module-definition"
import { CoreGateway } from "./core.gateway"
@Module({
    providers: [
        CoreGateway,
    ],
})
export class CoreModule extends ConfigurableModuleClass {}