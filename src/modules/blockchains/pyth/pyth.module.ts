import { Module } from "@nestjs/common"
import { PythService } from "./pyth.service"
import { PythSuiService } from "./pyth-sui.service"
import { PythSolanaService } from "./pyth-solana.service"
import { ConfigurableModuleClass } from "./pyth.module-definition"

@Module({
    providers: [
        PythService,
        PythSuiService,
        PythSolanaService,
    ],
    exports: [
        PythService,
        PythSuiService,
        PythSolanaService,
    ],
})
export class PythModule extends ConfigurableModuleClass {}