import {
    Injectable
} from "@nestjs/common"
import {
    v4 as uuidv4
} from "uuid"

/**
 * Generates and stores a unique ID for the current app instance.
 * Used to distinguish events from this instance vs others.
 */
@Injectable()
export class InstanceIdService {
    private readonly instanceId: string

    constructor() {
        this.instanceId = uuidv4()
    }

    /**
     * Get the unique ID of the current app instance.
     */
    getId(): string {
        return this.instanceId
    }
}