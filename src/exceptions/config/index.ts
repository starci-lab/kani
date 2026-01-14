/**
 * Configuration Exceptions
 * Errors related to missing or invalid configuration settings
 */

import { AbstractException } from "../abstract"
import { ChainId, Network } from "@typedefs"
import { TokenId } from "@modules/databases"

/** Thrown when gas configuration is not found */
export class GasConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Gas config not found", "GAS_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when balance configuration is not found */
export class BalanceConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Balance config not found", "BALANCE_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when account limits configuration is not found */
export class AccountLimitsConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Account limits config not found", "ACCOUNT_LIMITS_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when fee configuration is not found */
export class FeeConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee config not found", "FEE_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when RPC ejection configuration is not found */
export class RpcEjectionConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Rpc ejection config not found", "RPC_EJECTION_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when minimum gas required config is not found for chain */
export class MinGasRequiredNotFoundException extends AbstractException {
    constructor(chainId: ChainId, network: Network, message?: string) {
        super(message || `Min gas required not found for chain ${chainId} and network ${network}`, "MIN_GAS_REQUIRED_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when target token configuration is not found */
export class TargetTokenConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Target token config not found", "TARGET_TOKEN_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when minimum target token required config is not found */
export class MinTargetTokenRequiredNotFoundException extends AbstractException {
    constructor(tokenId: TokenId, message?: string) {
        super(message || "Min target token required not found", "MIN_TARGET_TOKEN_REQUIRED_NOT_FOUND_EXCEPTION", { tokenId })
    }
}

/** Thrown when target operational gas amount config is not found */
export class TargetOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Target operational gas amount not found", "TARGET_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when minimum operational gas amount config is not found */
export class MinOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Min operational gas amount not found", "MIN_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when gas swap threshold amount config is not found */
export class GasSwapThresholdAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Gas swap threshold amount not found", "GAS_SWAP_THRESHOLD_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when additional swap amount gas config is not found */
export class AdditionalSwapAmountGasNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Additional swap amount gas not found", "ADDITIONAL_SWAP_AMOUNT_GAS_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when quote operational gas amount config is not found */
export class QuoteOperationalGasAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Quote operational gas amount not found", "QUOTE_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when gas balance amount config is not found */
export class GasBalanceAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Gas balance amount not found", "GAS_BALANCE_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when gas balance is below minimum required */
export class InsufficientMinGasBalanceAmountException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Insufficient min gas balance amount", "INSUFFICIENT_MIN_GAS_BALANCE_AMOUNT_EXCEPTION", { chainId })
    }
}

/** Thrown when fee rate configuration is not found */
export class FeeRateNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee rate not found", "FEE_RATE_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when fee destination address is not found */
export class FeeToAddressNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Fee to address not found", "FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when client configuration is not found */
export class ClientConfigNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Client config not found", "CLIENT_CONFIG_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when additional swap required threshold config is not found */
export class AdditionalSwapRequiredThresholdNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Additional swap required threshold not found", "ADDITIONAL_SWAP_REQUIRED_THRESHOLD_NOT_FOUND_EXCEPTION", { chainId })
    }
}

/** Thrown when additional swap amount config is not found */
export class AdditionalSwapAmountNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || "Additional swap amount not found", "ADDITIONAL_SWAP_AMOUNT_NOT_FOUND_EXCEPTION", { chainId })
    }
}