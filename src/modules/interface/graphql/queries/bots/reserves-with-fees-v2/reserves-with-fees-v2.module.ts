import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./reserves-with-fees-v2.module-definition"
import {
    ReservesWithFeesV2Service,
} from "./reserves-with-fees-v2.service"
import {
    ReservesWithFeesV2Resolver,
} from "./reserves-with-fees-v2.resolver"

@Module({
    providers: [
        ReservesWithFeesV2Service,
        ReservesWithFeesV2Resolver,
    ],
})
export class ReservesWithFeesV2Module extends ConfigurableModuleClass {}
