import {
    ChainId,
} from "@modules/blockchains"
import {
    RpcAccessType,
} from "@modules/filesystem"
import {
    TokenId,
} from "@modules/databases"

export interface PythPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

export interface PythPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

export interface PythSubscriptionsOpenedMessage {
    streamName: string
    symbols: Array<string>
}

export interface PythSubscriptionsClosedMessage {
    streamName: string
    error: string
    symbols: Array<string>
}

export interface PythSubscriptionResolvedMessage {
    streamName: string
    symbols: Array<string>
}

export interface PythSubscriptionErrorMessage {
    streamName: string
    error: string
    symbols: Array<string>
}

export interface PythRestPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

export interface PythRestPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

export interface CoinMarketCapPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

export interface CoinMarketCapPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

export interface CoingeckoPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

export interface CoingeckoPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

export interface NoAvailableRpcMessage {
    chainId: ChainId
    accessType: RpcAccessType
}

export interface WebsocketSubscriptionOpenedMessage {
    streamName: string
    symbols: Array<string>
}

export interface WebsocketSubscriptionClosedMessage {
    streamName: string
    symbols: Array<string>
    durationMs: number
}

export interface WebsocketSubscriptionErrorMessage {
    streamName: string
    error: string
    symbols: Array<string>
}

export interface WebsocketSubscriptionResolvedMessage {
    streamName: string
    symbols: Array<string>
}

export interface EjectRpcFatalErrorMessage {
    rpcId: string
}

export interface EjectRpcRetryableErrorMessage {
    rpcId: string
}

export interface EjectRpcIgnorableErrorMessage {
    rpcId: string
}

export interface ErrorDecryptingJwtSecretKeyMessage {
    error: string
}

export interface ErrorDecryptingAesKeyMessage {
    error: string
}
