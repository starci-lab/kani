import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./fees-v2.module-definition"
import { FeesV2Service } from "./fees-v2.service"
import { FeesV2Resolver } from "./fees-v2.resolver"

@Module({
    providers: [
        FeesV2Service,
        FeesV2Resolver,
    ],
})
export class FeesV2Module extends ConfigurableModuleClass {}

