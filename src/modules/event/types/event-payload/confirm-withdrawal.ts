/** Received token for confirm withdrawal. */
export interface ReceivedToken {
    id: string
    amount: string
}

/** Event payload for confirm withdrawal. */
export interface ConfirmWithdrawalEventPayload {
    botId: string
    txHashes: Array<string>
    receivedTokens: Array<ReceivedToken>
}