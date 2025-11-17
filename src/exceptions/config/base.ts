import { AbstractException } from "../abstract"
import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases"

export class GasConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Gas config not found", "GAS_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

export class MinGasRequiredNotFoundException extends AbstractException {
    constructor(chainId: ChainId, network: Network, message?: string) {
        super(message || `Min gas required not found for chain ${chainId} and network ${network}`, "MIN_GAS_REQUIRED_NOT_FOUND_EXCEPTION_EXCEPTION")
    }
}

export class TargetTokenConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Target token config not found", "TARGET_TOKEN_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

export class MinTargetTokenRequiredNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, network: Network, message?: string) {
        super(message || "Min target token required not found", "MIN_TARGET_TOKEN_REQUIRED_NOT_FOUND_EXCEPTION")
    }
}