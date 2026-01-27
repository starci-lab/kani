import {
    Module 
} from "@nestjs/common"
import {
    PositionAssociateService 
} from "./position.service"
import {
    ConfigurableModuleClass 
} from "./associate.module-definition"
import {
    ActivePositionAssociateService 
} from "./active-position.service"

@Module({
    providers: [
        PositionAssociateService,
        ActivePositionAssociateService
    ],
    exports: [
        PositionAssociateService,
        ActivePositionAssociateService
    ]
})
export class AssociateModule extends ConfigurableModuleClass {
}