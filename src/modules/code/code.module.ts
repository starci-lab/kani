import { Module } from "@nestjs/common"
import {
    CodeGeneratorService,
} from "./code-generator.service"
import { ConfigurableModuleClass } from "./code.module-definition"

@Module({
    imports: [
    ],
    providers: [
        CodeGeneratorService,
    ],
    exports: [CodeGeneratorService],
})
export class CodeModule extends ConfigurableModuleClass {}
