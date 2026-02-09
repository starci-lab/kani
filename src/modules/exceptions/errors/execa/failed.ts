/**
 * Thrown when a shell/command execution fails (execa stderr or non-zero exit).
 */

import type {
    AbstractExceptionMetadata
} from "../abstract"
import {
    AbstractException
} from "../abstract"

export interface ExecaExecutionFailedExceptionMetadata extends AbstractExceptionMetadata {
    command: string
    args: Array<string>
    stderr: string
    stdout?: string
    exitCode?: number
}

export class ExecaExecutionFailedException extends AbstractException {
    constructor(
        {
            command,
            args,
            stderr,
            stdout,
            exitCode,
            originalError,
        }: ExecaExecutionFailedExceptionMetadata
    ) {
        super(
            "Execution failed",
            "EXECUTION_FAILED_EXCEPTION",
            {
                command,
                args,
                stderr,
                stdout,
                exitCode,
                originalError,
            }
        )
    }
}
