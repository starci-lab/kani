import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./http.module-definition"

@Module({
    imports: [],
})
export class HttpModule extends ConfigurableModuleClass {}