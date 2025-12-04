import { AbstractException } from "../abstract"
import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases"

export class GasConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Gas config not found", "GAS_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

export class FeeConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee config not found", "FEE_CONFIG_NOT_FOUND_EXCEPTION")
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
    constructor(tokenId: TokenId, message?: string) {
        super(
            message || "Min target token required not found", 
            "MIN_TARGET_TOKEN_REQUIRED_NOT_FOUND_EXCEPTION", 
            { tokenId }
        )
    }
}

export class TargetOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(
            message || "Target operational gas amount not found", 
            "TARGET_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            { chainId }
        )
    }
}

export class MinOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Min operational gas amount not found", 
            "MIN_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            { chainId }
        )
    }
}
export class QuoteOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Quote operational gas amount not found", 
            "QUOTE_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            { chainId }
        )
    }
}

export class GasBalanceAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Gas balance amount not found", 
            "GAS_BALANCE_AMOUNT_NOT_FOUND_EXCEPTION", 
            { chainId }
        )
    }
}

export class InsufficientMinGasBalanceAmountException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Insufficient min gas balance amount", 
            "INSUFFICIENT_MIN_GAS_BALANCE_AMOUNT_EXCEPTION", 
            { chainId }
        )
    }
}

export class FeeRateNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee rate not found", "FEE_RATE_NOT_FOUND_EXCEPTION")
    }
}

export class FeeToAddressNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee to address not found", "FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION")
    }
}

export class ClientConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Client config not found", "CLIENT_CONFIG_NOT_FOUND_EXCEPTION")
    }
}