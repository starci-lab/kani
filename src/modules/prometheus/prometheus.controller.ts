import {
    Controller,
    Get,
    Res,
} from "@nestjs/common"
import type {
    Response,
} from "express"
import {
    Registry,
} from "prom-client"
import {
    InjectPrometheusRegistry,
} from "./prometheus.decorators"
import {
    prometheusRestConfig,
} from "@modules/service-configs"
import {
    ApiOperation,
} from "@nestjs/swagger"

/**
 * Exposes Prometheus metrics for scraping.
 *
 * @example
 * GET /api/metrics
 */
@Controller(
    prometheusRestConfig().jobs().tags
)
export class PrometheusController {
    constructor(
        @InjectPrometheusRegistry()
        private readonly registry: Registry,
    ) {}
    
    @ApiOperation({
        summary: "Get Prometheus metrics",
        description: "Get Prometheus metrics for the application.",
    })
    @Get()
    async getMetrics(
        @Res({
            passthrough: true 
        }) res: Response
    ): Promise<string> {
        res.setHeader(
            "Content-Type",
            this.registry.contentType,
        )
        return this.registry.metrics()
    }
}
