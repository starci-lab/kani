import { ChainId } from "@modules/common"
import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { ISwapService } from "./swap.interface"
import { SuiSwapService } from "./sui-swap.service"

@Injectable()
export class SwapService {
    constructor(
        private readonly moduleRef: ModuleRef,
    ) { }

    getSwapService(chainId: ChainId): ISwapService {
        switch (chainId) {
        case ChainId.Sui:
            return this.moduleRef.get(SuiSwapService, { strict: false })
        default:
            throw new Error(`Swap service for chain ${chainId} not found`)
        }
    }
}