import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./portfolio-value-v2.module-definition"
import {
    PortfolioValueV2Service,
} from "./portfolio-value-v2.service"
import {
    PortfolioValueV2Resolver,
} from "./portfolio-value-v2.resolver"

@Module({
    providers: [
        PortfolioValueV2Service,
        PortfolioValueV2Resolver,
    ],
})
export class PortfolioValueV2Module extends ConfigurableModuleClass {}


