import { Provider } from "@nestjs/common"
import { PrivyClient } from "@privy-io/node"
import { PRIVY } from "./constants"
import { envConfig } from "@modules/env"

export const createPrivyClientProvider = (): Provider => ({
    provide: PRIVY,
    useFactory: () => {
        return new PrivyClient({
            appId: envConfig().privy.appId,
            appSecret: envConfig().privy.appSecret,
        })
    }
})