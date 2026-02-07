import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    Injectable 
} from "@nestjs/common"
import {
    SuperJSON 
} from "superjson"
import {
    PrefixKeys,
    ToStringObject 
} from "@modules/common"
import _ from "lodash"
/**
 * Service to deserialize a ToStringObject<T> to a Partial<T>.
 */
@Injectable()
export class SerializerService {
    constructor(
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}
    /**
     * Serialize a Record<keyof T, unknown> to a Partial<Record<keyof T, string>>.
     * @param data - The data to serialize.
     * @returns The serialized data.
     */
    serialize<T extends object>(
        data: Partial<T>,
    ): Partial<PrefixKeys<T, "data">> {
        return _.mapValues(
            _.mapKeys(data,
                (_, key) => `data.${String(key)}`),
            (value) => this.superJson.stringify(value),
        ) as Partial<PrefixKeys<T, "data">>
    }
    /**
     * Deserialize a ToStringObject<T> to a Partial<T>.
     * @param data - The data to deserialize.
     * @returns The deserialized data.
     */
    deserialize<T extends object>(data: Partial<ToStringObject<T>>): Partial<T> {
        return _.mapValues(
            _.pickBy(data,
                (value) => _.isString(value)),
            (value) => this.superJson.parse(value),
        ) as Partial<T>
    }
}
