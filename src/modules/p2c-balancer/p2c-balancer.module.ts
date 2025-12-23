import { Module } from "@nestjs/common"
import { P2CBalancerService } from "./p2c-balancer.service"
import { ConfigurableModuleClass } from "./p2c.module-definition"

@Module({
    providers: [P2CBalancerService],
    exports: [P2CBalancerService],
})
export class P2CBalancerModule extends ConfigurableModuleClass {}