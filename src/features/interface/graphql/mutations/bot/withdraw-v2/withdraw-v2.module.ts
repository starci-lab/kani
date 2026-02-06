import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./withdraw-v2.module-definition"
import {
    WithdrawV2Resolver
} from "./withdraw-v2.resolver"
import {
    WithdrawV2Service
} from "./withdraw-v2.service"

@Module({
    providers: [
        WithdrawV2Service,
        WithdrawV2Resolver,
    ],
})
export class WithdrawV2Module extends ConfigurableModuleClass {}
