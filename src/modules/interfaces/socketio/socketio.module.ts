import {
    Module 
} from "@nestjs/common"
import {
    PriceModule 
} from "./price"
import {
    ConfigurableModuleClass 
} from "./socketio.module-definition"

@Module({
    imports: [
        PriceModule.register({
            isGlobal: true,
        }),
    ],
})
export class SocketIoModule extends ConfigurableModuleClass {}