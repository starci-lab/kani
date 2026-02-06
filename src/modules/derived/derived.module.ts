import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./derived.module-definition"
import {
    DerivedAesKeyService
} from "./derived-aes-key-service.service"
import {
    DerivedJwtSecretService
} from "./derived-jwt-secret-service.service"

@Module({
    providers: [
        DerivedAesKeyService,
        DerivedJwtSecretService,
    ],
    exports: [
        DerivedAesKeyService,
        DerivedJwtSecretService,
    ],
})
export class DerivedModule extends ConfigurableModuleClass {}
