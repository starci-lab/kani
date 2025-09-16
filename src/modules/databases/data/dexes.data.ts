import { DexId } from "@modules/databases/enums"
import { DexLike } from "@modules/databases/types"

export const dexData: Array<DexLike> = [
    {
        displayId: DexId.Cetus,
        name: "Cetus",
        description: "Cetus is a decentralized exchange on Sui.",
        website: "https://cetus.zone/",
        iconUrl: "https://assets.coingecko.com/coins/images/32311/large/cetus.png",
    },
    {
        displayId: DexId.Turbos,
        name: "Turbos",
        description: "Turbos is a decentralized exchange on Sui.",
        website: "https://turbos.finance/",
        iconUrl: "https://assets.coingecko.com/coins/images/30671/large/token-turbos.png",
    },
    {
        displayId: DexId.Momentum,
        name: "Momentum",
        description: "Momentum is a decentralized exchange on Sui.",
        website: "https://momentum.xyz/",
        iconUrl: "https://assets.coingecko.com/coins/images/32311/large/cetus.png",
    },
]


