import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./bots-v2.module-definition"
import {
    BotsV2Service 
} from "./bots-v2.service"
import {
    BotsV2Resolver 
} from "./bots-v2.resolver"

@Module({
    providers: [
        BotsV2Service,
        BotsV2Resolver,
    ],
})
export class BotsV2Module extends ConfigurableModuleClass {}

