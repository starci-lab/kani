import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./update-bot-settings-v2.module-definition"
import { UpdateBotSettingsV2Resolver } from "./update-bot-settings-v2.resolver"
import { UpdateBotSettingsV2Service } from "./update-bot-settings-v2.service"

@Module({
    providers: [
        UpdateBotSettingsV2Service,
        UpdateBotSettingsV2Resolver,
    ],
})
export class UpdateBotSettingsV2Module extends ConfigurableModuleClass {}


