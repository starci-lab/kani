import { Injectable } from "@nestjs/common"
import { execa } from "execa"

@Injectable()
export class ExecaService {

    constructor() {
    }
    public async exec(command: string, args: Array<string> = []): Promise<string> {
        const subprocess = execa(command, args, {
            shell: false,
        })
        // Execute the command
        const { stdout, stderr } = await subprocess
        if (stderr) {
            throw new Error(stderr)
        }
        return stdout
    }
}