import { ChainId } from "@typedefs"

export enum RpcAccessType {
    Read = "read",
    Write = "write",
}

export interface RpcAccessConfig {
    // id of the rpc
    id: string
    // The url of the rpc
    url: string
    // The weight of the rpc, 
    // the higher the weight, the more likely 
    // the rpc will be used
    weight: number
    // Whether the rpc supports ws
    supportWs: boolean
    // The access types of the rpc
    accessTypes: Array<RpcAccessType>
}

// Simplified client config schema, only contains the rpc access configs for each chain
export interface RpcAccessConfigs {
    [ChainId.Solana]: Array<RpcAccessConfig>
    [ChainId.Sui]: Array<RpcAccessConfig>
}

/* ================= SMTP ================= */

export interface SmtpConfig {
    host: string
    port: number
    user: string
    password: string
    from: string
    secure: boolean
  }
  
/* ================= GCP ================= */
  
export interface GcpConfig {
    projectId: string
    location: string
  }
  
/* ================= Google APIs ================= */
  
export interface GoogleDriveConfig {
    folderIds: {
      db: string
      keys: string
    }
  }
  
export interface GoogleApisConfig {
    drive: GoogleDriveConfig
  }
  
/* ================= Fees ================= */
  
export interface OpenPositionFeeConfig {
    feeToAddress: string
    feeRate: number
  }
  
export interface SwapReferralFeeConfig {
    feeToAddress: string
    referralTokenAccountAddress: string
    bps: number
  }
  
export interface FeesConfig {
    openPosition: {
      solana: OpenPositionFeeConfig
      sui: OpenPositionFeeConfig
    }
    swapReferral: {
      solana: SwapReferralFeeConfig
      sui: SwapReferralFeeConfig
    }
  }
  
/* ================= ROOT CONFIG ================= */
  
export interface AppConfig {
    // api keys & external services
    jupiter: string
    sentryDsn: string
    cryptoKeyName: string
  
    gcp: GcpConfig
    googleapis: GoogleApisConfig
  
    smtp: SmtpConfig
    fees: FeesConfig
}