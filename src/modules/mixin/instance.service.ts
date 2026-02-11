import {
    Injectable
} from "@nestjs/common"
import dayjs, {
    Dayjs 
} from "dayjs"
import {
    v4 as uuidv4
} from "uuid"
import {
    envConfig,
    runInKubernetes
} from "@modules/env"

/**
 * Service for the current app instance.
 */
@Injectable()
export class InstanceService {
    // instance id, deprecated since we use pod id instead
    private readonly id: string
    // instance created at
    private readonly createdAt: Dayjs

    constructor() {
        // instance id
        this.id = runInKubernetes() ? envConfig().k8s.global.podName : uuidv4()
        // instance created at
        this.createdAt = dayjs()
    }

    /**
     * Get the unique ID of the current app instance.
     */
    getId(): string {
        return this.id
    }

    /**
     * Get the created at of the current app instance.
     */
    getCreatedAt(): Dayjs {
        return this.createdAt
    }
}