import { Injectable } from "@nestjs/common"
import { Registry, Histogram, Counter, collectDefaultMetrics, exponentialBuckets } from "prom-client"

@Injectable()
export class PromClientService {
    public readonly register: Registry
    public readonly httpRequestHistogram: Histogram<string>
    public readonly swapSuccessCounter: Counter<string>
    public readonly openPositionSuccessCounter: Counter<string>
    public readonly closePositionSuccessCounter: Counter<string>
    public readonly activeBotsCounter: Counter<string>
    constructor() {
        this.register = new Registry()

        // default node metrics
        collectDefaultMetrics({
            register: this.register,
            prefix: "kanibot_",
        })

        // HTTP request duration
        this.httpRequestHistogram = new Histogram({
            name: "kanibot_http_request_seconds",
            help: "HTTP request duration",
            labelNames: ["method", "route", "statusCode"] as const,
            buckets: exponentialBuckets(0.01, 2, 10),
            registers: [this.register],
        })

        // Swap success
        this.swapSuccessCounter = new Counter({
            name: "kanibot_swap_success_total",
            help: "Number of successful swap tx",
            labelNames: ["tokenIn", "tokenOut"] as const,
            registers: [this.register],
        })

        // RPC latency metrics
        this.activeBotsCounter = new Counter({
            name: "kanibot_active_bots_total",
            help: "Number of active bots",
            registers: [this.register],
        })
    }
}