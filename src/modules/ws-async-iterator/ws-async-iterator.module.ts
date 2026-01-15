import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./ws-async-iterator.module-definition"
import { WsAsyncIteratorService } from "./ws-async-iterator.service"

@Module({
    providers: [
        WsAsyncIteratorService,
    ],
    exports: [WsAsyncIteratorService],
})
export class WsAsyncIteratorModule extends ConfigurableModuleClass {}
