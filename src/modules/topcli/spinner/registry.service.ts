import { Injectable } from "@nestjs/common"
import { Spinner } from "@topcli/spinner"

@Injectable()
export class SpinnerRegistryService {
    private readonly spinners: Record<string, Spinner> = {}

    constructor() {}

    register(id: string) {
        this.spinners[id] = new Spinner()
    }

    spinner(id: string) {
        if (!this.spinners[id]) {
            this.register(id)
        }
        return this.spinners[id]
    }
}   