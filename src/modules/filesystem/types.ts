export interface AppSecrets {
    smtp: SmtpConfig
    keys: SecurityKeys
}

export interface SmtpConfig {
    host: string
    port: number
    user: string
    key: string
    from: string
}

export interface SecurityKeys {
    aes: string
    "jwt-secret": string
    gcp: GcpConfig
}

export interface GcpConfig {
    kms: KmsConfig
}

export interface KmsConfig {
    keyName: string
}

export interface SmtpConfig {
    host: string
    port: number
    user: string
    key: string
    from: string
}