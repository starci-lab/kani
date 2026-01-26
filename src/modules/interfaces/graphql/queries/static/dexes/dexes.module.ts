import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./dexes.module-definition"
import {
    DexesService 
} from "./dexes.service"
import {
    DexesResolver 
} from "./dexes.resolver"

@Module({
    providers: [
        DexesService,
        DexesResolver,
    ],
})
export class DexesModule extends ConfigurableModuleClass {}

