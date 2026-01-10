import { ConfigurableModuleClass } from "./lease.module-definition"
import { Module } from "@nestjs/common"
import { LeaseService } from "./lease.service"

@Module({
    providers: [
        LeaseService
    ],
    exports: [
        LeaseService
    ],
})
export class LeaseModule extends ConfigurableModuleClass {}