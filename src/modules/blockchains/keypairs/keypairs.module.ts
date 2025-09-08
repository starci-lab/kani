
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./keypairs.module-definition"
import { KeypairsService } from "./keypairs.service"

@Module({
    providers: [KeypairsService],
    exports: [KeypairsService],
})
export class KeypairsModule extends ConfigurableModuleClass {}
