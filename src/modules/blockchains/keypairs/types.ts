export interface KeypairsOptions {
    useGcpKms?: boolean
}

export interface GeneratedKeypair {
    accountAddress: string
    encryptedPrivateKey: string
}