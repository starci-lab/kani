import { DexId } from "@modules/databases/enums"
import { DexLike } from "@modules/databases/types"

export const dexData: Array<DexLike> = [
    {
        displayId: DexId.Cetus,
        name: "Cetus",
        description: "Cetus is a decentralized exchange on Sui.",
        website: "https://cetus.zone/",
        iconUrl: "https://r2.starci.net/protocols/cetus.png",
    },
    {
        displayId: DexId.Turbos,
        name: "Turbos",
        description: "Turbos is a decentralized exchange on Sui.",
        website: "https://turbos.finance/",
        iconUrl: "https://r2.starci.net/protocols/turbos.jpg",
    },
    {
        displayId: DexId.Momentum,
        name: "Momentum",
        description: "Momentum is a decentralized exchange on Sui.",
        website: "https://momentum.xyz/",
        iconUrl: "https://r2.starci.net/protocols/mmt.png",
    },
]


