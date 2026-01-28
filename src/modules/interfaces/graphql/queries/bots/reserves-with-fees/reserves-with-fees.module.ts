import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./reserves-with-fees.module-definition"
import {
    ReservesWithFeesService,
} from "./reserves-with-fees.service"
import {
    ReservesWithFeesResolver,
} from "./reserves-with-fees.resolver"

@Module({
    providers: [
        ReservesWithFeesService,
        ReservesWithFeesResolver,
    ],
})
export class ReservesWithFeesModule extends ConfigurableModuleClass {}
