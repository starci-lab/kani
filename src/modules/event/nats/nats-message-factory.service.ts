import {
    createHash 
} from "@modules/common"
import {
    InjectSuperJson, InstanceService 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import SuperJSON from "superjson"
import _ from "lodash"
import type {
    NatsCreateMessageParams,
    NatsCreateMessageResult,
    NatsMessage,
    NatsParseMessageResult,
} from "./types"

/**
 * Factory service for creating and parsing NATS messages (envelope: id, digest, data).
 *
 * @example
 * const str = factory.create({ message: { id: 1 }, withoutHash: false })
 * const parsed = factory.parse(str)
 */
@Injectable()
export class NatsMessageFactoryService {
    constructor(
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly instanceService: InstanceService,
    ) {}

    /**
     * Builds the message envelope (data, digest, id); used internally by create.
     *
     * @param params - Message and optional withoutHash
     * @returns Partial envelope (omitBy undefined)
     */
    private createMessage<T extends object>({
        message,
        withoutHash = false,
    }: NatsCreateMessageParams<T>): Partial<NatsMessage<T>> {
        return _.omitBy(
            {
                data: message,
                digest: withoutHash ? undefined : createHash(message),
                id: this.instanceService.getId(),
            },
            _.isUndefined,
        )
    }

    /**
     * Serializes a message into the NATS envelope string.
     *
     * @param params - Message data and optional withoutHash
     * @returns Serialized envelope string
     *
     * @example
     * const payload = factory.create({ message: { event: 'ping' }, withoutHash: true })
     */
    create<T extends object>({
        message,
        withoutHash = false,
    }: NatsCreateMessageParams<T>): NatsCreateMessageResult {
        return this.superjson.stringify(
            this.createMessage({
                message, withoutHash 
            }),
        )
    }

    /**
     * Parses a serialized payload into the NATS message envelope.
     *
     * @param payload - Serialized envelope string
     * @returns Parsed envelope (data, id, digest?)
     *
     * @example
     * const envelope = factory.parse<MyPayload>(raw)
     */
    parse<T extends object>(payload: string): NatsParseMessageResult<T> {
        return this.superjson.parse<NatsMessage<T>>(payload)
    }
}
