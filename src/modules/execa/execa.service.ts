import {
    Injectable
} from "@nestjs/common"
import {
    ExecaExecutionFailedException
} from "@exceptions"
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
            })
        }
        return stdout
    }
}