import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./services.module-definition"
import {
    PerformanceService 
} from "./performance.service"
import {
    ValidateService 
} from "./validate.service"
import {
    PaginateService 
} from "./paginate.service"

@Module({
    providers: [
        PerformanceService,
        ValidateService,
        PaginateService,
    ],
    exports: [
        PerformanceService,
        ValidateService,
        PaginateService,
    ],
})
export class ServicesModule extends ConfigurableModuleClass {
}