export const isSameAddress = (addressA: string, addressB: string) => {
    // if address has Sui-like 
    if (isSuiType(addressA) && isSuiType(addressB)) { 
        if (
            isSuiCoin(addressA) && isSuiCoin(addressB)
        ) {
            return true
        }
        return addressA === addressB
    }
    return addressA === addressB
}

export const isSuiCoin = (type: string): boolean => {
    const suiCoinTypes = [
        "0x2::sui::SUI",
        "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    ].map(value => value.toLowerCase())
    if (
        suiCoinTypes.includes(type.toLowerCase()) 
    ) {
        return true
    }
    return false
}

export const isSuiType = (type: string): boolean => {
    const re = /^0x[0-9a-fA-F]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/
    return re.test(type)
}