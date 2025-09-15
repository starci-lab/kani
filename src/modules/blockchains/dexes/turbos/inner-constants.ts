import { DexId } from "@modules/databases"
import { suiDexConfig } from "../config"

export const clientIndex = suiDexConfig[DexId.Momentum]?.clientIndex || 0
