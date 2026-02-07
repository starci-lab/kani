
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./coordinator.module-definition"
import {
    LoadersModule 
} from "./loaders"
import {
    BussinessModule 
} from "./bussiness"
import {
    RuntimesModule 
} from "./runtimes"

@Module({
    imports: [
        LoadersModule.register({
            isGlobal: true,
        }),
        BussinessModule.register({
            isGlobal: true,
        }),
        RuntimesModule.register({
            isGlobal: true,
        }),
    ],
})
export class CoordinatorModule extends ConfigurableModuleClass {}
