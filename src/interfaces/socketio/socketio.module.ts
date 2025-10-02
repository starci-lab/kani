import { Module } from "@nestjs/common"
import { PythModule } from "./pyth"
import { ConfigurableModuleClass } from "./socketio.module-definition"

@Module({
    imports: [
        PythModule.register({
            isGlobal: true,
        })
    ],
})
export class SocketIoModule extends ConfigurableModuleClass {}