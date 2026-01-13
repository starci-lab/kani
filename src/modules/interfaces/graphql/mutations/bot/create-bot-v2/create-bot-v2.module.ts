import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./create-bot-v2.module-definition"
import { CreateBotV2Service } from "./create-bot-v2.service"
import { CreateBotV2Resolver } from "./create-bot-v2.resolver"

@Module({
    providers: [
        CreateBotV2Service,
        CreateBotV2Resolver,
    ],
})
export class CreateBotV2Module extends ConfigurableModuleClass {}

