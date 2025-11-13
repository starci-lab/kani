import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./websocket.module-definition"
import { WebsocketService } from "./websocket.service"

@Module({
    providers: [WebsocketService],
    exports: [WebsocketService],
})
export class WebsocketModule extends ConfigurableModuleClass {
}
