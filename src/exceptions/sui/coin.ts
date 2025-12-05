import { AbstractException } from "../abstract"

export class CoinArgumentNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Coin argument not found", "COIN_ARGUMENT_NOT_FOUND_EXCEPTION")
    }
}

export class CoinAssetNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Coin asset not found", "COIN_ASSET_NOT_FOUND_EXCEPTION")
    }
}