import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./inspector.module-definition"
@Module({
})
export class InspectorModule extends ConfigurableModuleClass {}