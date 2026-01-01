import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./derived.module-definition"
import { DerivedAesKeyService } from "./derived-aes-key-service.service"

@Module({
    providers: [
        DerivedAesKeyService,
    ],
    exports: [
        DerivedAesKeyService,
    ],
})
export class DerivedModule extends ConfigurableModuleClass {}
