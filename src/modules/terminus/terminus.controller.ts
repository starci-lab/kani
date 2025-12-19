import { DependenciesService } from "./dependencies/dependencies.service"
import { Controller, Get, Inject } from "@nestjs/common"
import { MODULE_OPTIONS_TOKEN } from "./terminus.module-definition"
import { TerminusOptions } from "./types"
import { HealthCheck } from "@nestjs/terminus"

@Controller("terminus")
export class TerminusController {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: TerminusOptions,
        private readonly dependenciesService: DependenciesService,
    ) {}

    @Get("/startup")
    @HealthCheck()
    async startup() {
        return this.dependenciesService.ping(this.options.dependencies)
    }

    @Get("/readiness")
    @HealthCheck()
    async readiness() {
        return this.dependenciesService.ping(this.options.dependencies)
    }

    @Get("/liveness")
    @HealthCheck()
    async liveness() {
        return this.dependenciesService.ping(this.options.dependencies)
    }
}