import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./sealed.module-definition"
import { SealedAesService } from "./aes.service"

@Module({
    providers: [
        SealedAesService,
    ],
    exports: [
        SealedAesService,
    ],
})
export class SealedModule extends ConfigurableModuleClass {}
