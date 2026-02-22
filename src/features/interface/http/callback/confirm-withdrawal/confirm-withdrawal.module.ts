import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./confirm-withdrawal.module-definition"
import {
    ConfirmWithdrawalService 
} from "./confirm-withdrawal.service"
import {
    ConfirmWithdrawalController 
} from "./confirm-withdrawal.controller"

@Module({
    controllers: [
        ConfirmWithdrawalController,
    ],
    providers: [
        ConfirmWithdrawalService,
    ],
})
export class ConfirmWithdrawalModule extends ConfigurableModuleClass {}

