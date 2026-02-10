import {
    Injectable
} from "@nestjs/common"
import dayjs, {
    Dayjs 
} from "dayjs"
import {
    v4 as uuidv4
} from "uuid"

/**
 * Service for the current app instance.
 */
@Injectable()
export class InstanceService {
    private readonly createdAt: Dayjs
    private readonly instanceId: string

    constructor() {
        this.instanceId = uuidv4()
        this.createdAt = dayjs()
    }

    /**
     * Get the unique ID of the current app instance.
     */
    getId(): string {
        return this.instanceId
    }

    /**
     * Get the created at of the current app instance.
     */
    getCreatedAt(): Dayjs {
        return this.createdAt
    }
}