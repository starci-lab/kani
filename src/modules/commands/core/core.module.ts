import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./core.module-definition"
import {
    DatabaseModule,
} from "./database"

@Module({
})
export class CoreModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE = {
    }) {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                DatabaseModule.register(
                    {
                        isGlobal: options.isGlobal,
                    }
                ),
            ],
        }
    }
}
