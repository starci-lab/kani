import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"

@Injectable()
export class PoolSelectorService {
    constructor(
        private readonly moduleRef: ModuleRef
    ) { }
}