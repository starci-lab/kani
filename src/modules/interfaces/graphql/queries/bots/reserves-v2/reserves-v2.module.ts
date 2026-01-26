import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./reserves-v2.module-definition"
import {
    ReservesV2Service 
} from "./reserves-v2.service"
import {
    ReservesV2Resolver 
} from "./reserves-v2.resolver"

@Module({
    providers: [
        ReservesV2Service,
        ReservesV2Resolver,
    ],
})
export class ReservesV2Module extends ConfigurableModuleClass {}

