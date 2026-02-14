// crypto-keypair-bytes.ts

const algorithm: EcKeyImportParams = {
    name: "ECDSA",
    namedCurve: "P-256",
}
  
/**
 * Export CryptoKey (private, PKCS8 DER) -> Uint8Array
 */
export const exportPrivateKeyToBytes = async (
    privateKey: CryptoKey
): Promise<Uint8Array> => {
  
    const pkcs8 = await crypto.subtle.exportKey(
        "pkcs8",
        privateKey
    )
  
    return new Uint8Array(pkcs8)
}

/**
 * Import Uint8Array (PKCS8 DER) -> CryptoKey private
 */
export const importPrivateKeyFromBytes = async (
    bytes: Uint8Array
): Promise<CryptoKey> => {
    return crypto.subtle.importKey(
        "pkcs8",
        new Uint8Array(bytes),
        algorithm,
        true,       // extractable
        ["sign"]
    )
}