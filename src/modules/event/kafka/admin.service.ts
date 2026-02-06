import {
    envConfig 
} from "@modules/env"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./kafka.module-definition"
import {
    Injectable, OnModuleInit, Inject 
} from "@nestjs/common"
import {
    Admin, ITopicConfig 
} from "kafkajs"
import {
    InjectKafkaAdmin 
} from "./kafka.decorators"
import {
    WinstonLog 
} from "@modules/winston"
import {
    WinstonService 
} from "@modules/winston"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    configMap 
} from "../config"

@Injectable()
export class KafkaAdminService implements OnModuleInit {
    constructor(
        /**
         * Kafka Admin client.
         *
         * This client is used ONLY for administrative operations:
         * - create topics
         * - delete topics
         * - alter topic configurations
         *
         * This is NOT used for producing or consuming messages.
         */
        @InjectKafkaAdmin()
        private readonly admin: Admin,

        /**
         * Module-level options.
         *
         * Example options:
         * - createTopics: boolean
         *
         * This allows enabling/disabling topic management
         * depending on the environment (dev/staging/prod).
         */
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,

        /**
         * Winston logger for structured logging.
         */
        private readonly winstonService: WinstonService,

        /**
         * Readiness watcher factory.
         *
         * Used to coordinate startup order between:
         * - Kafka admin
         * - Kafka producer
         * - Kafka consumer
         */
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * NestJS lifecycle hook.
     *
     * This method is called once when the module is initialized.
     * It is responsible for preparing Kafka infrastructure
     * BEFORE any producer or consumer starts.
     */
    async onModuleInit(): Promise<void> {
        /**
         * Register a readiness watcher for KafkaAdminService.
         *
         * Other components (producer/consumer) will wait for this
         * watcher before connecting to Kafka.
         */
        this.readinessWatcherFactoryService.createWatcher(
            KafkaAdminService.name,
        )
        /**
         * Topic management is explicitly enabled via module options.
         *
         * This prevents accidental topic creation/deletion
         * in sensitive environments like production.
         */
        if (this.options.createTopicsIfNotExists) {
            /**
             * Create Kafka topics based on application metadata.
             */
            await this.createTopics()
        }

        /**
         * Mark KafkaAdminService as ready.
         *
         * At this point:
         * - Topics exist
         * - Topic configs are applied
         *
         * Producers and consumers are now allowed to connect.
         */
        this.readinessWatcherFactoryService.setReady(
            KafkaAdminService.name,
        )
    }

    /**
     * Create Kafka topics defined in eventMetadataMap.
     *
     * Each event corresponds to exactly one Kafka topic.
     * All topic configuration is centralized here to avoid:
     * - auto-created topics
     * - unsafe default settings
     */
    async createTopics(): Promise<void> {
        /**
         * Filter only events that explicitly opt in to Kafka.
         */
        const topics = Object.entries(configMap).filter(
            ([, metadata]) => metadata.useKafka,
        )
        const listedTopics = await this.admin.listTopics()
        // get the topics that are not in the listedTopics
        const topicsToCreate = topics.filter(([topic]) => !listedTopics.includes(topic))
        if (!topicsToCreate.length) {
            return
        }
        /**
         * Convert event metadata into Kafka topic definitions.
         */
        const topicConfigs: Array<ITopicConfig> = topicsToCreate.map(
            ([eventName,
                metadata]) => ({
                /**
                 * Topic name.
                 *
                 * Convention:
                 * - event name === topic name
                 */
                topic: eventName,

                /**
                 * Number of partitions.
                 *
                 * Controls parallelism within a consumer group.
                 */
                numPartitions:
                    metadata.config?.numPartitions ??
                    envConfig().kafka.numPartitions,

                /**
                 * Replication factor.
                 *
                 * - Single broker: must be 1
                 * - Multi-broker production: usually 3
                 */
                replicationFactor:
                    metadata.config?.replicationFactor ??
                    envConfig().kafka.replicationFactor,

                /**
                 * Topic-level configuration entries.
                 *
                 * These settings define:
                 * - how long data is retained
                 * - how disk space is reclaimed
                 * - how timestamps are interpreted
                 */
                configEntries: [
                    /**
                     * retention.ms
                     *
                     * Maximum time messages are retained.
                     * After this, Kafka marks segments for deletion.
                     */
                    {
                        name: "retention.ms",
                        value: (
                            metadata.config?.retentionMs ??
                            envConfig().kafka.retentionMs
                        ).toString(),
                    },

                    /**
                     * cleanup.policy
                     *
                     * - delete  → remove messages after retention
                     * - compact → keep latest message per key
                     */
                    {
                        name: "cleanup.policy",
                        value: (
                            metadata.config?.cleanupPolicy ??
                            envConfig().kafka.cleanupPolicy
                        ).toString(),
                    },

                    /**
                     * segment.ms
                     *
                     * Maximum time before Kafka rolls a new log segment.
                     *
                     * Kafka deletes entire segments, not individual messages,
                     * so this must be small for short retention topics.
                     */
                    {
                        name: "segment.ms",
                        value: (
                            metadata.config?.segmentMs ??
                            envConfig().kafka.segmentMs
                        ).toString(),
                    },

                    /**
                     * segment.bytes
                     *
                     * Maximum size of a log segment before rolling.
                     */
                    {
                        name: "segment.bytes",
                        value: (
                            metadata.config?.segmentBytes ??
                            envConfig().kafka.segmentBytes
                        ).toString(),
                    },

                    /**
                     * max.message.bytes
                     *
                     * Upper bound on message size.
                     * Protects broker memory and disk IO.
                     */
                    {
                        name: "max.message.bytes",
                        value: (
                            metadata.config?.maxMessageBytes ??
                            envConfig().kafka.maxMessageBytes
                        ).toString(),
                    },

                    /**
                     * message.timestamp.type
                     *
                     * - CreateTime     → timestamp from producer
                     * - LogAppendTime  → timestamp from broker
                     *
                     * LogAppendTime is preferred for:
                     * - broadcast events
                     * - realtime messaging
                     */
                    {
                        name: "message.timestamp.type",
                        value: "LogAppendTime",
                    },

                    /**
                     * file.delete.delay.ms
                     *
                     * Delay before Kafka physically deletes
                     * a log segment from disk after it is marked for deletion.
                     */
                    {
                        name: "file.delete.delay.ms",
                        value: (
                            metadata.config?.fileDeleteDelayMs ??
                            envConfig().kafka.fileDeleteDelayMs
                        ).toString(),
                    },
                ],
            }),
        )

        /**
         * Request Kafka to create topics.
         *
         * This call is asynchronous on the broker side.
         */
        await this.admin.createTopics(
            {
                topics: topicConfigs,
            }
        )
        this.winstonService.log(WinstonLog.KafkaTopicsCreated,
            {
                topics: topicsToCreate.map(([topic]) => topic),
            }
        )
    }

    /**
     * Delete Kafka topics defined in eventMetadataMap.
     *
     * This is destructive and should only be used in development.
     */
    async deleteTopics(): Promise<void> {
        const topics = Object.entries(configMap)
            .filter(([, metadata]) => metadata.useKafka)
            .map(([topic]) => topic)
        const listedTopics = await this.admin.listTopics()
        // get the topics that are not in the listedTopics
        const topicsToDelete = topics.filter(topic => !listedTopics.includes(topic))
        if (!topicsToDelete.length) {
            return
        }
        await this.admin.deleteTopics({
            topics: topicsToDelete,
        })
        this.winstonService.log(WinstonLog.KafkaTopicsDeleted,
            {
                topics: topicsToDelete,
            }
        )
    }
}
