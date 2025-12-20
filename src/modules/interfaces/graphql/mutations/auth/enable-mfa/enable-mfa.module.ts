import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./enable-mfa.module-definition"
import { EnableMFAService } from "./enable-mfa.service"
import { EnableMFAResolver } from "./enable-mfa.resolver"

@Module({
    providers: [
        EnableMFAService,
        EnableMFAResolver,
    ],
})
export class EnableMFAModule extends ConfigurableModuleClass {}

