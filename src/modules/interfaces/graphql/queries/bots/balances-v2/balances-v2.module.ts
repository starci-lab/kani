import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./balances-v2.module-definition"
import {
    BalancesV2Service 
} from "./balances-v2.service"
import {
    BalancesV2Resolver 
} from "./balances-v2.resolver"

@Module({
    providers: [
        BalancesV2Service,
        BalancesV2Resolver,
    ],
})
export class BalancesV2Module extends ConfigurableModuleClass {}

