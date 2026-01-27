import {
    Module 
} from "@nestjs/common"
import {
    DynamicModule 
} from "./dynamic"
import {
    ConfigurableModuleClass 
} from "./socketio.module-definition"

@Module({
    imports: [
        DynamicModule.register({
            isGlobal: true,
        }),
    ],
})
export class SocketIoModule extends ConfigurableModuleClass {}