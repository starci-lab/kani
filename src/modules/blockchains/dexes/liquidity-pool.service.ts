import { DexId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { IFetchService, IMetadataService } from "../interfaces"
import { CetusFetcherService, CetusMetadataService, TurbosFetcherService, TurbosMetadataService } from "."
import { ChainId } from "@modules/common"

@Injectable()
export class LiquidityPoolService {
    constructor(
        private readonly moduleRef: ModuleRef
    ) { }

    async getDexs({
        dexIds,
        chainId
    }: GetDexParams) {
        dexIds ??= Object.values(DexId)
        const dexes: Array<DexResponse> = []
        for (const dexId of dexIds) {
            switch (dexId) {
            case DexId.Cetus: {
                const fetcher = this.moduleRef.get(CetusFetcherService, { strict: false })
                const metadata = this.moduleRef.get(CetusMetadataService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata
                })
                break
            }
            case DexId.Turbos: {
                const fetcher = this.moduleRef.get(TurbosFetcherService, { strict: false })
                const metadata = this.moduleRef.get(TurbosMetadataService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata
                })
                break
            }
            default: {
                throw new Error(`Dex ${dexId} not found`)
            }
            }
        }
        return dexes
    }
}

export interface GetDexParams {
    dexIds?: Array<DexId>
    chainId: ChainId
}

export interface DexResponse {
    dexId: DexId
    fetcher: IFetchService
    metadata: IMetadataService
}