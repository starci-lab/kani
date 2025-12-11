import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./webhooks.module-definition"

@Module({
    imports: [
    ],
})
export class WebhooksModule extends ConfigurableModuleClass {}