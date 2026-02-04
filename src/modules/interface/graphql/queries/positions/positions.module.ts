import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./positions.module-definition"
import {
    PositionsV1Module,
} from "./positions"
import {
    PositionsV2Module,
} from "./positions-v2"

@Module({
    imports: [
        PositionsV1Module.register({
            isGlobal: true,
        }),
        PositionsV2Module.register({
            isGlobal: true,
        }),
    ],
})
export class PositionsModule extends ConfigurableModuleClass {}


