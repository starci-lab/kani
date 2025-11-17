import { Injectable } from "@nestjs/common"
import { Mutex } from "async-mutex"

@Injectable()
export class MutexService {
    private readonly mutexes = new Map<string, Mutex>()
    constructor(
    ) {}

    mutex(key: string): Mutex {
        if (this.mutexes.has(key)) {
            return this.mutexes.get(key)!
        }
        const mutex = new Mutex()
        this.mutexes.set(key, mutex)
        return mutex
    }
}