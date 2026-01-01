import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./sealed.module-definition"
import { SealedAesService } from "./aes.service"
import { SealedJwtSecretService } from "./jwt-secret.service"

@Module({
    providers: [
        SealedAesService,
        SealedJwtSecretService,
    ],
    exports: [
        SealedAesService,
        SealedJwtSecretService,
    ],
})
export class SealedModule extends ConfigurableModuleClass {}
