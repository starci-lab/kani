export const httpsToWss = (httpsUrl: string): string => {
    return httpsUrl.replace("https://", "wss://")
}