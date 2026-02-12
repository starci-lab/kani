export const httpsToWss = (httpsUrl: string): string => {
    return httpsUrl.replace("https://",
        "wss://")
}

export const isSuiCoin = (type: string): boolean => {
    const suiCoinTypes = [
        "0x2::sui::SUI",
        "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    ].map(value => value.toLowerCase())
    if (suiCoinTypes.includes(type.toLowerCase())) {
        return true
    }
    return false
}

export const isSolanaWrapped = (tokenAddress: string): boolean => {
    const wsolMintAddress = "So11111111111111111111111111111111111111112"
    if (tokenAddress.toLowerCase() === wsolMintAddress.toLowerCase()) {
        return true
    }
    return false
}