/**
 * Service that bridges NATS messages to NestJS EventEmitter.
 *
 * Subscribes to NATS subjects and emits events to the local EventEmitter,
 * filtering out messages from the same instance and deduplicating by digest.
 *
 * @example
 * Injected via NatsModule; subscribes on init to configured subjects.
 */
import type {
    NatsBridgeParsedPayload, NatsConfigMapEntryMetadata 
} from "./types"
import {
    Inject,
    Injectable,
    OnModuleInit,
    OnApplicationShutdown,
} from "@nestjs/common"
import {
    EventEmitter2 
} from "@nestjs/event-emitter"
import _ from "lodash"
import {
    CacheKey, CacheService, CacheType 
} from "@modules/cache"
import {
    InstanceService 
} from "@modules/mixin"
import {
    configMap 
} from "../config"
import {
    EventName 
} from "../enums"
import {
    getEventName 
} from "../utils"
import {
    NatsConsumerService 
} from "./consumer.service"
import {
    NatsMessageFactoryService 
} from "./nats-message-factory.service"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./nats.module-definition"

@Injectable()
export class NatsBridgeService implements OnModuleInit, OnApplicationShutdown {
    private subjects: Array<string> = []

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly natsConsumerService: NatsConsumerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly natsMessageFactoryService: NatsMessageFactoryService,
        private readonly cacheService: CacheService,
        private readonly instanceService: InstanceService,
    ) {}

    async onModuleInit(): Promise<void> {
        const allNatsSubjects = Object.entries(configMap)
            .filter(
                ([, metadata]) =>
                    (metadata as NatsConfigMapEntryMetadata).useNats,
            )
            .map(([eventName]) => eventName)

        this.subjects = _.intersection(
            allNatsSubjects,
            _.uniq([...(this.options.subjects ?? []),
                EventName.Ping]),
        )

        await this.natsConsumerService.subscribe({
            subjects: this.subjects,
            callback: async (subject, data) => {
                const value = new TextDecoder().decode(data) || "{}"
                let parsed: NatsBridgeParsedPayload
                try {
                    parsed = this.natsMessageFactoryService.parse(
                        value,
                    ) as NatsBridgeParsedPayload
                } catch {
                    return
                }

                if (parsed.id === this.instanceService.getId()) {
                    if (subject === EventName.Ping) {
                        // keepalive; no-op
                    }
                    return
                }

                if (parsed.digest) {
                    const cached = await this.cacheService.get({
                        key: CacheKey.NatsMessageDigest,
                        args: [parsed.digest],
                        cacheType: CacheType.Memory,
                    })
                    if (cached) return
                    await this.cacheService.set({
                        key: CacheKey.NatsMessageDigest,
                        args: [parsed.digest],
                        cacheResult: true,
                        cacheType: CacheType.Memory,
                    })
                }

                this.eventEmitter.emit(
                    getEventName(subject as EventName),
                    parsed.data,
                )
            },
        })
    }

    onApplicationShutdown(): void {
        // drain/close handled by NatsConsumerService
    }
}
