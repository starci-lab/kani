import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./http.module-definition"
import {
    CallbackModule 
} from "./callback"

@Module({
    imports: [
        CallbackModule.register({
            isGlobal: true,
        }),
    ],
})
export class HttpModule extends ConfigurableModuleClass {}