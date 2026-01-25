import {
    Module 
} from "@nestjs/common"
import {
    PositionAssociateService 
} from "./position.service"
import {
    ConfigurableModuleClass 
} from "./associate.module-definition"
@Module({
    providers: [
        PositionAssociateService
    ],
    exports: [
        PositionAssociateService
    ]
})
export class AssociateModule extends ConfigurableModuleClass {
}