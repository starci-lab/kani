import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import SuperJSON from "superjson"
import {
    KafkaMessage 
} from "./types"
import {
    createHash 
} from "@modules/common"
import _ from "lodash"
import {
    InstanceService 
} from "@modules/mixin"

/**
 * Factory service for creating and parsing Kafka messages.
 */
@Injectable()
export class KafkaMessageFactoryService {
    constructor(
    @InjectSuperJson()
    private readonly superjson: SuperJSON,
    private readonly instanceService: InstanceService,
    ) {}

    /**
   * Build KafkaMessage envelope.
   */
    private createMessage<T extends object>(message: T, withoutHash: boolean = false): Partial<KafkaMessage<T>> {
        // if message has snapshotAt field, remove it from creating digest
        return _.omitBy(
            {
                data: message,
                digest: withoutHash ? undefined : createHash(
                    _.omit(
                        message,
                        ["snapshotAt"]
                    )
                ),
                id: this.instanceService.getId(),
            },
            _.isUndefined
        )
    }

    /**
   * Create and serialize Kafka message.
   */
    public create<T extends object>(message: T, withoutHash: boolean = false): string {
        return this.superjson.stringify(this.createMessage(
            message,
            withoutHash
        ))
    }

    /**
   * Parse and deserialize Kafka message.
   */
    public parse<T extends object>(payload: string): KafkaMessage<T> {
        return this.superjson.parse<KafkaMessage<T>>(payload)
    }
}
