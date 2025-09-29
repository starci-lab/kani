
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./cookie.module-definition"
import {
    CookieService
} from "./cookie.service"

@Module({
    providers: [CookieService],
    exports: [CookieService],
})
export class CookieModule extends ConfigurableModuleClass {}
