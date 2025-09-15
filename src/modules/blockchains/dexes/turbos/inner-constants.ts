import { DexId } from "@modules/databases"
import { suiDexConfig } from "../config"

export const clientIndex = suiDexConfig[DexId.Turbos]?.clientIndex || 0
