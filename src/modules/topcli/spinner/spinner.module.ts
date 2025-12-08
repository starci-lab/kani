import { Module } from "@nestjs/common" 
import { SpinnerRegistryService } from "./registry.service"
import { ConfigurableModuleClass } from "./spinner.module-definition"
import { SpinnerOpenPositionService } from "./open-position.service"

@Module({
    providers: [
        SpinnerRegistryService,
        SpinnerOpenPositionService,
    ],
    exports: [
        SpinnerRegistryService,
        SpinnerOpenPositionService,
    ],
})
export class SpinnerModule extends ConfigurableModuleClass {}
