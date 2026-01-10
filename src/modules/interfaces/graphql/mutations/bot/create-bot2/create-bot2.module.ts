import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./create-bot2.module-definition"
import { CreateBot2Service } from "./create-bot2.service"
import { CreateBot2Resolver } from "./create-bot2.resolver"

@Module({
    providers: [
        CreateBot2Service,
        CreateBot2Resolver,
    ],
})
export class CreateBot2Module extends ConfigurableModuleClass {}

