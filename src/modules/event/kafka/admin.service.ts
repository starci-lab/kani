import { envConfig } from "@modules/env"
import { eventMetadataMap } from "../map"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./kafka.module-definition"
import { Injectable, OnModuleInit, Inject } from "@nestjs/common"
import { Admin } from "kafkajs"
import { InjectKafkaAdmin } from "./kafka.decorators"

@Injectable()
export class KafkaTopicsService implements OnModuleInit {
    constructor(
        /**
         * Kafka Admin client.
         * Used ONLY for cluster administration:
         * - create topics
         * - alter topic configuration
         *
         * This is NOT a producer or consumer.
         */
        @InjectKafkaAdmin()
        private readonly admin: Admin,

        /**
         * Module-level options.
         * Example:
         *  - createTopics: true/false
         *
         * This allows controlling behavior per environment
         * (enabled in dev/staging, disabled in production).
         */
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE
    ) {}

    /**
     * NestJS lifecycle hook.
     * Runs once when the module is initialized.
     */
    async onModuleInit(): Promise<void> {
        /**
         * Only create topics when explicitly enabled.
         * This avoids accidental topic creation in production.
         */
        if (this.options.createTopics) {
            await this.createTopics()
        }
    }

    /**
     * Creates Kafka topics based on event metadata.
     *
     * Each event maps to exactly one Kafka topic.
     * All topic configuration is centralized here to avoid
     * auto-created topics with unsafe defaults.
     */
    async createTopics(): Promise<void> {
        await this.admin.createTopics({
            topics: Object.entries(eventMetadataMap)
                /**
                 * Only include events that explicitly opt in to Kafka.
                 */
                .filter(([, metadata]) => metadata.kafka)

                /**
                 * Convert event metadata into Kafka topic definitions.
                 */
                .map(([eventName, metadata]) => ({
                    /**
                     * Topic name.
                     * Convention: event name === topic name.
                     */
                    topic: eventName,

                    /**
                     * Number of partitions for the topic.
                     *
                     * - Allows scaling consumers within the same group.
                     * - Can be increased later if needed.
                     */
                    numPartitions:
                        metadata.kafka?.numPartitions ??
                        envConfig().kafka.numPartitions,

                    /**
                     * Replication factor.
                     *
                     * - Single broker: must be 1
                     * - Multi-broker: typically 3 for production
                     */
                    replicationFactor:
                        metadata.kafka?.replicationFactor ??
                        envConfig().kafka.replicationFactor,

                    /**
                     * Topic-level configuration.
                     *
                     * These settings control:
                     * - data retention
                     * - disk usage
                     * - cleanup behavior
                     *
                     * This is CRITICAL for production stability.
                     */
                    topicConfig: {
                        /**
                         * How long messages are retained (in milliseconds).
                         *
                         * - Realtime/broadcast topics: very short (e.g. 1s)
                         * - Durable/event topics: longer (e.g. days)
                         */
                        "retention.ms":
                            metadata.kafka?.retentionMs ??
                            envConfig().kafka.retentionMs,

                        /**
                         * Cleanup policy.
                         *
                         * - "delete": messages are deleted after retention
                         * - "compact": keeps the latest message per key
                         */
                        "cleanup.policy":
                            metadata.kafka?.cleanupPolicy ??
                            envConfig().kafka.cleanupPolicy,

                        /**
                         * Maximum time before Kafka rolls a new log segment.
                         *
                         * This is especially important for short retention:
                         * Kafka deletes whole segments, not individual messages.
                         */
                        "segment.ms":
                            metadata.kafka?.segmentMs ??
                            envConfig().kafka.segmentMs,

                        /**
                         * Maximum size of a log segment before rolling.
                         *
                         * Prevents very large segment files and helps
                         * control disk usage and cleanup granularity.
                         */
                        "segment.bytes":
                            metadata.kafka?.segmentBytes ??
                            envConfig().kafka.segmentBytes,
                    },
                })),
        })
    }
}
