import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./callback.module-definition"
import {
    ConfirmWithdrawalModule 
} from "./confirm-withdrawal"

@Module({
    imports: [
        ConfirmWithdrawalModule.register({
            isGlobal: true,
        }),
    ],
})
export class CallbackModule extends ConfigurableModuleClass {}