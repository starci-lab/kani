import type {
    Dayjs,
} from "dayjs"
import {
    DayjsService,
} from "@modules/mixin"
import {
    Injectable,
} from "@nestjs/common"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

/** Context for a debug latency measurement. */
export interface DebugLatencyContext {
    /** The name of the context. */
    name: string
    /** The start time of the context. */
    startTime: Dayjs
}

/** Params for creating a debug latency context. */
export interface CreateContextParams {
    /** The id of the context. */
    id: string
    /** The name of the context. */
    name: string
}

/** Params for measuring execution latency. */
export interface MeasureParams {
    /** The id of the context. */
    id: string
    /** The description of the execution. */
    description: string
}

/**
 * Service for measuring execution latency between createContext and measure.
 *
 * @example
 * await latencyService.createContext("my-operation")
 * // ... do work ...
 * latencyService.measure("my-operation")
 */
@Injectable()
export class DebugLatencyService {
    private readonly contextMap: Map<string, DebugLatencyContext> = new Map()

    constructor(
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService
    ) {}

    /**
     * Create a context for a given id (records start time).
     *
     * @param params - The parameters for creating the context.
     * @returns Promise that resolves when context is stored.
     *
     * @example
     * await latencyService.createContext({ id: "request-1", name: "my-operation" })
     */
    createContext(
        { 
            id, 
            name 
        }: CreateContextParams
    ): void {
        // store start time for id
        this.contextMap.set(
            id,
            {
                name,
                startTime: this.dayjsService.now(),
            }
        )
    }

    /**
     * Measure latency since createContext(id), log it as verbose, and clear the context.
     *
     * @param id - The id of the context.
     * @returns void. No-op if no context exists for id.
     *
     * @example
     * latencyService.measure("request-1")
     */
    measure(
        { id, description }: MeasureParams
    ): void {
        const context = this.contextMap.get(id)
        if (!context) {
            return
        }

        // compute duration and clear context
        const endTime = this.dayjsService.now()
        const latency = endTime.diff(
            context.startTime,
            "millisecond",
        )
        this.contextMap.delete(id)

        // log at verbose level
        this.winstonService.log(
            WinstonLog.ExecutionLatency,
            {
                id,
                name: context.name,
                durationSeconds: latency / 1000,
                description,
            },
        )
    }

    /**
     * End a context for a given id.
     * @param id - The id of the context.
     * @returns void.
     */
    end(
        id: string
    ): void {
        this.contextMap.delete(id)
    }
}
