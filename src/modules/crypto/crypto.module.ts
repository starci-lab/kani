
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./crypto.module-definition"
import {
    EncryptionService
} from "./encryption.service"

@Module({
    providers: [EncryptionService],
    exports: [EncryptionService],
})
export class CryptoModule extends ConfigurableModuleClass {
}
