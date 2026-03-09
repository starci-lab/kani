
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./observer.module-definition"
import {
    CexHealthMonitorModule,
} from "./cex-health-monitor"

@Module({
    imports: [
        CexHealthMonitorModule.register(
            {
                isGlobal: true,
            }
        ),
    ],
})
export class ObserverModule extends ConfigurableModuleClass {}
