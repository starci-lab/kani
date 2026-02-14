import type {
    ComputeQuoteRatioResult, SwapStep 
} from "@modules/blockchains"

export interface ReconcileBalancePlanDeterminedMessage {
    botId: string
    jobId: string
    quoteRatioResult: ComputeQuoteRatioResult
    swapSteps: Array<SwapStep>
}