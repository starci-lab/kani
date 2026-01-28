import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./socketio.module-definition"
import {
    WsResponseService 
} from "./response.service"

@Module({
    providers: [
        WsResponseService,
    ],
    exports: [WsResponseService],
})
export class SocketIoModule extends ConfigurableModuleClass {}
