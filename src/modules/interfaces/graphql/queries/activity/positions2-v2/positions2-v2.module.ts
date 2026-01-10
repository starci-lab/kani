import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./positions2-v2.module-definition"
import { Positions2V2Service } from "./positions2-v2.service"
import { Positions2V2Resolver } from "./positions2-v2.resolver"

@Module({
    providers: [
        Positions2V2Service,
        Positions2V2Resolver,
    ],
})
export class Positions2V2Module extends ConfigurableModuleClass {}

