import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./callback.module-definition"
import {
    CallbackGateway,
} from "./callback.gateway"

@Module({
    providers: [
        CallbackGateway,
    ],
})
export class CallbackModule extends ConfigurableModuleClass {}


