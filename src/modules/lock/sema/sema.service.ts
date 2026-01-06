import { Injectable } from "@nestjs/common"
import { Sema } from "async-sema"


@Injectable()
export class SemaService {
    private readonly semas = new Map<string, Sema>()
    sema(key: string, maxConcurrency= 1) {
        if (!this.semas.has(key)) {
            this.semas.set(key, new Sema(maxConcurrency))
        }
        return this.semas.get(key)!
    }
}