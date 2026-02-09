import {
    Injectable
} from "@nestjs/common"
import {
    ExecaExecutionFailedException
} from "@modules/exceptions"
import {
    execa
} from "execa"
import type {
    ExecParams,
    ExecResult
} from "./types"

/**
 * Service to run shell commands via execa (no shell by default).
 */
@Injectable()
export class ExecaService {
    /**
     * Run a command and return stdout; throws if stderr is set.
     */
    async exec(
        { command, args = [] }: ExecParams
    ): Promise<ExecResult> {
        try {
            const subprocess = execa(command,
                args,
                {
                    shell: false
                })
            const { stdout, stderr } = await subprocess
            if (stderr) {
                throw new ExecaExecutionFailedException({
                    command,
                    args,
                    stderr,
                    stdout,
                })
            }
            return stdout
        } catch (err: unknown) {
            const execaErr = err as { exitCode?: number; stdout?: string; stderr?: string }
            throw new ExecaExecutionFailedException({
                command,
                args,
                stderr: execaErr.stderr ?? String(err),
                stdout: execaErr.stdout,
                exitCode: execaErr.exitCode,
                originalError: err instanceof Error ? err : undefined,
            })
        }
    }
}