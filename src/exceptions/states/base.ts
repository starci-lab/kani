import { AbstractException } from "../abstract"

export class StateRpcEjectionRecordNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "State rpc ejection record not found", "STATE_RPC_EJECTION_RECORD_NOT_FOUND_EXCEPTION")
    }
}