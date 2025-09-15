import { DexId } from "@modules/databases"

export interface SuiDexConfig {
  clientIndex: number;
}
export const suiDexConfig: Partial<Record<DexId, SuiDexConfig>> = {
    [DexId.Cetus]: { clientIndex: 0 },
    [DexId.Turbos]: { clientIndex: 1 },
    [DexId.Momentum]: { clientIndex: 2 },
    [DexId.FlowX]: { clientIndex: 3 },
}
