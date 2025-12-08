import { Injectable } from "@nestjs/common"
import ora, { Ora } from "ora"

@Injectable()
export class OraService {
    private readonly oras: Record<string, Ora> = {}
    constructor() {}

    start(id: string, message: string) {
        this.oras[id] = ora(message).start()
        if (this.oras[id]) {
            this.oras[id].color = "cyan"
        }
    }

    succeed(id: string, message: string) {
        this.oras[id]?.succeed(message)
    }

    fail(id: string, message: string) {
        this.oras[id]?.fail(message)
    }

    update(id: string, message: string) {
        if (!this.oras[id]) return 
        this.oras[id].text = message
    }

    getMessage(id: string) {
        return this.oras[id]?.text
    }

    clear(id: string) {
        this.oras[id]?.clear()
        delete this.oras[id]
    }

    ora(id: string) {
        return this.oras[id]
    }
}