import { Injectable } from "@nestjs/common"
import { execa } from "execa"

@Injectable()
export class ExecaService {
    private readonly shell: "powershell.exe" | "/bin/sh"

    constructor() {
        const platform = process.platform
        this.shell = platform === "win32" ? "powershell.exe" : "/bin/sh"
    }
    public async exec(command: string, args: Array<string> = []): Promise<string> {
        const subprocess = execa(command, args, {
            shell: this.shell,
        })
        // Execute the command
        const { stdout, stderr } = await subprocess

        if (stderr) {
            throw new Error(stderr)
        }
        return stdout
    }
}