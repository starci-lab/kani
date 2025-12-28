/** ========== TRANSACTION EVENTS ========== */

export interface MintNftEvent {
    nft_address: string
    pool_id: string
    position_id: string
}

export interface MintEvent {
    amount_a: string
    amount_b: string
    liquidity_delta: string
    owner: string
    pool: string
}

