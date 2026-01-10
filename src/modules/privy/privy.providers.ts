import { Provider } from "@nestjs/common"
import { PRIVY_CLIENT } from "./constants"
import { PrivyClient } from "@privy-io/node"
import { getAppConfig, getPrivyAppSecretKey } from "@modules/filesystem"

export const createPrivyClientProvider = (): Provider => ({
    provide: PRIVY_CLIENT,
    useFactory: () => {
        return new PrivyClient(
            {
                appId: getAppConfig().privy.appId,
                appSecret: getPrivyAppSecretKey(),
            }
        )
    }
})