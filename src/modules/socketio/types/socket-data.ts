/** Data attached to the socket (e.g. userId). */
export interface SocketData {
    // user id
    userId: string
    // bot id 
    botId?: string
    // liquidity pools
    liquidityPoolIds?: Array<string>
}
