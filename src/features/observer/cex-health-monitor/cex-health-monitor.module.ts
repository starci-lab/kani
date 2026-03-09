
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./observer.module-definition"

@Module({
    imports: [
    ],
})
export class ObserverModule extends ConfigurableModuleClass {}
