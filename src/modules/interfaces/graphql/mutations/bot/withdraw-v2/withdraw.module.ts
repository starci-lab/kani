import {
    Module
} from "@nestjs/common"
import {
    ConfigurableModuleClass
} from "./withdraw.module-definition"
import {
    WithdrawResolver
} from "./withdraw.resolver"
import {
    WithdrawService
} from "./withdraw.service"

@Module({
    providers: [
        WithdrawService,
        WithdrawResolver,
    ],
})
export class WithdrawModule extends ConfigurableModuleClass {}
