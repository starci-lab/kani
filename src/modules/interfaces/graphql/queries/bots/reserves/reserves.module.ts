import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./reserves.module-definition"
import { ReservesService } from "./reserves.service"
import { ReservesResolver } from "./reserves.resolver"

@Module({
    providers: [
        ReservesService,
        ReservesResolver,
    ],
})
export class ReservesModule extends ConfigurableModuleClass {}

