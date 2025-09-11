import { Inject, Provider } from "@nestjs/common"
import SuperJSON from "superjson"
import BN from "bn.js"
export const SUPERJSON = "SUPERJSON"

export const InjectSuperJson = () => Inject(SUPERJSON)

export const createSuperJsonServiceProvider = (): Provider<SuperJSON> => ({
    provide: SUPERJSON,
    useFactory: () => {
        const superjson = new SuperJSON()
        // extends bn
        superjson.registerCustom<BN, string>(
            {
                isApplicable: (v): v is BN => {
                    try {
                        return BN.isBN(v)
                    } catch {
                        return false
                    }
                },
                serialize: (v) => v.toString(),
                deserialize: (v) => new BN(v),
            },
            "bn.js" // identifier
        )
        return superjson
    },
})