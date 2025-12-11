import { Module } from "@nestjs/common"
import { createPrivyClientProvider } from "./privy.providers"
import { PrivyService } from "./privy.service"
import { ConfigurableModuleClass } from "./privy.module-definition"

@Module({
    providers: [
        createPrivyClientProvider(),
        PrivyService,
    ],
    exports: [
        createPrivyClientProvider(),
        PrivyService,
    ],
})
export class PrivyModule extends ConfigurableModuleClass {}
