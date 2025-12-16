import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./activity.module-definition"
import { ActivityService } from "./activity.service"
import { ActivityResolver } from "./activity.resolver"
import { Activity2Service } from "./activity2.service"
import { Activity2Resolver } from "./activity2.resolver"
@Module({
    providers: [
        ActivityService,
        ActivityResolver,
        Activity2Service, 
        Activity2Resolver
    ],
})
export class ActivityModule extends ConfigurableModuleClass {}