import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pyth.module-definition"
import { PythGateway } from "./pyth.gateway"
@Module({
    providers: [
        PythGateway,
    ],
})
export class PythModule extends ConfigurableModuleClass {}