import {
    Injectable 
} from "@nestjs/common"
import {
    IDispatchPayload 
} from "../types"

@Injectable()
export class DispatcherUtilsService {
    constructor(
    ) { }

    /**
     * Computes the step count for a given payload.
     * @param payload - The payload to compute the step count for.
     * @returns The step count.
     */
    computeStepCount(
        payload: IDispatchPayload,
    ): number {
        return 1 + (payload.prepareTxs.length ?? 0)*2
    }
}