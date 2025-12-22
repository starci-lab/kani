import { AbstractException } from "../abstract"

export class ExecutorNotFoundException extends AbstractException {
    constructor(executorId: string, message?: string) {
        super(message || `Executor with id ${executorId} not found`, "EXECUTOR_NOT_FOUND_EXCEPTION", { executorId })
    }
}