import { Inject, Provider } from "@nestjs/common"
import SuperJSON from "superjson"
import BN from "bn.js"
import { PublicKey } from "@solana/web3.js"
import Decimal from "decimal.js"
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
        superjson.registerCustom<PublicKey, string>(
            {
                isApplicable: (v): v is PublicKey => {
                    return v instanceof PublicKey
                },
                serialize: (v) => v.toString(),
                deserialize: (v) => new PublicKey(v),
            },
            "solana.web3.js.PublicKey" // identifier
        )
        superjson.registerCustom<Decimal, string>(
            {
                isApplicable: (v): v is Decimal => {
                    return Decimal.isDecimal(v)
                },
                serialize: (v) => v.toString(),
                deserialize: (v) => new Decimal(v),
            },
            "decimal.js" // identifier
        )
        return superjson
    },
})