import { DexId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { IFetchService, IMetadataService, IActionService } from "../interfaces"
import { 
    CetusActionService, 
    CetusFetcherService, 
    CetusMetadataService,
} from "./cetus"
import { ChainId } from "@modules/common"
import { 
    MomentumActionService, 
    MomentumFetcherService, 
    MomentumMetadataService 
} from "./momentum"
import { TurbosActionService, TurbosFetcherService, TurbosMetadataService } from "./turbos"
import { FlowXActionService, FlowXFetcherService, FlowXMetadataService } from "./flowx"
import { RaydiumActionService, RaydiumFetcherService, RaydiumMetadataService } from "./raydium"
import { OrcaActionService, OrcaFetcherService, OrcaMetadataService } from "./orca"
import { MeteoraActionService, MeteoraFetcherService, MeteoraMetadataService } from "./meteora"

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
                const action = this.moduleRef.get(CetusActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.Turbos: {
                const fetcher = this.moduleRef.get(TurbosFetcherService, { strict: false })
                const metadata = this.moduleRef.get(TurbosMetadataService, { strict: false })
                const action = this.moduleRef.get(TurbosActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.Momentum: {
                const fetcher = this.moduleRef.get(MomentumFetcherService, { strict: false })
                const metadata = this.moduleRef.get(MomentumMetadataService, { strict: false })
                const action = this.moduleRef.get(MomentumActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.FlowX: {
                const fetcher = this.moduleRef.get(FlowXFetcherService, { strict: false })
                const metadata = this.moduleRef.get(FlowXMetadataService, { strict: false })
                const action = this.moduleRef.get(FlowXActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.Raydium: {
                const fetcher = this.moduleRef.get(RaydiumFetcherService, { strict: false })
                const metadata = this.moduleRef.get(RaydiumMetadataService, { strict: false })
                const action = this.moduleRef.get(RaydiumActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.Orca: {
                const fetcher = this.moduleRef.get(OrcaFetcherService, { strict: false })
                const metadata = this.moduleRef.get(OrcaMetadataService, { strict: false })
                const action = this.moduleRef.get(OrcaActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
                })
                break
            }
            case DexId.Meteora: {
                const fetcher = this.moduleRef.get(MeteoraFetcherService, { strict: false })
                const metadata = this.moduleRef.get(MeteoraMetadataService, { strict: false })
                const action = this.moduleRef.get(MeteoraActionService, { strict: false })
                if (metadata.metadata().chainId !== chainId) {
                    continue
                }
                dexes.push({
                    dexId,
                    fetcher,
                    metadata,
                    action
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
    action: IActionService
}