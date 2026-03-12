/**
 * Service that creates StreamConnection<NatsMsg> instances using the
 * injected NATS connection and module options (queue group).
 *
 * Use with StreamAsyncIteratorService.createStream() to get an
 * AsyncIterable<NatsMsg> over NATS subjects.
 *
 * @example
 * const natsStream = app.get(NatsStreamConnectionService)
 * const connection = natsStream.createConnection({ subjects: ['events.>'] })
 * const stream = await streamService.createStream({ connection, ... })
 * for await (const msg of stream) { ... }
 */
import type {
    NatsConnection 
} from "nats"
import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    NatsStreamConnection as NatsStreamConnectionImpl 
} from "@modules/stream-async-iterator/adapters"
import {
    InjectNats 
} from "./nats.decorators"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from "./nats.module-definition"
import type {
    NatsStreamConnection,
    NatsStreamConnectionParams,
} from "./types"

@Injectable()
export class NatsStreamConnectionService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectNats()
        private readonly nc: NatsConnection,
    ) {}

    /**
     * Creates a StreamConnection<NatsMsg> for the given subjects.
     * Uses module queueGroup if params.queueGroup is not set.
     *
     * @param params - Subjects and optional queue group
     * @returns Stream connection over NATS messages
     *
     * @example
     * const connection = natsStream.createConnection({
     *   subjects: ['events.>'],
     *   queueGroup: 'workers',
     * })
     */
    createConnection(params: NatsStreamConnectionParams): NatsStreamConnection {
        const { subjects, queueGroup } = params
        return new NatsStreamConnectionImpl({
            nc: this.nc,
            subjects,
            queueGroup: queueGroup ?? this.options.queueGroup,
        })
    }
}
