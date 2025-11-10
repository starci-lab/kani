import { Module } from "@nestjs/common"
import { PythModule } from "./pyth"
import { ConfigurableModuleClass } from "./socketio.module-definition"
import { CoreModule } from "./core"

@Module({
    imports: [
        PythModule.register({
            isGlobal: true,
        }),
        CoreModule.register({
            isGlobal: true,
        })
    ],
})
export class SocketIoModule extends ConfigurableModuleClass {}