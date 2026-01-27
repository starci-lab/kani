import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./socketio.module-definition"
import {
    WsTransformService 
} from "./transform.service"

@Module({
    providers: [
        WsTransformService,
    ],
    exports: [WsTransformService],
})
export class SocketIoModule extends ConfigurableModuleClass {}
