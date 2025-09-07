import { Injectable } from "@nestjs/common"
import { v4 as uuidv4 } from "uuid"

/**
 * InstanceIdService
 * A service that generates and stores a unique ID for the current app instance.
 * This can be used to check whether a consumer received an event from this app
 * or from another app instance.
 */
@Injectable()
export class InstanceIdService {
    private readonly instanceId: string

    constructor() {
    // Generate a unique ID once when the app boots
        this.instanceId = uuidv4()
    }

    /**
   * Get the unique ID of the current app instance
   */
    getId(): string {
        return this.instanceId
    }
}