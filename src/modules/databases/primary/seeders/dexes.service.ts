import { DexId } from "../enums"
import { DeepPartial } from "@modules/common"
import { DexSchema } from "../schemas"
import { Seeder } from "nestjs-seeder"
import { InjectPrimaryMongoose } from "../decorators"
import { Connection } from "mongoose"
import { Injectable } from "@nestjs/common"

@Injectable()
export class DexesService implements Seeder {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async seed(): Promise<void> {
        await this.connection.model<DexSchema>(DexSchema.name).create(data)
    }

    async drop(): Promise<void> {
        await this.connection.model<DexSchema>(DexSchema.name).deleteMany({})
    }
}   

export const data: Array<DeepPartial<DexSchema>> 
= [
    {
        displayId: DexId.Cetus,
        name: "Cetus",
        description: "Cetus is a Move-native concentrated-liquidity DEX built on the Sui blockchain, aiming to provide efficient swaps and liquidity provisioning. It has undergone a major exploit in 2025 and is undergoing recovery efforts.",
        website: "https://cetus.zone/",
        iconUrl: "https://r2.kanibot.xyz/dexes/cetus.png",
    },
    {
        displayId: DexId.Turbos,
        name: "Turbos",
        description: "Turbos Finance is a high-performance non-custodial DEX and liquidity hub on the Sui network, focusing on speed, capital efficiency and user-friendly design. It also supports token launches and concentrated-liquidity pools.",
        website: "https://turbos.finance/",
        iconUrl: "https://r2.starci.net/protocols/turbos.png",
    },
    {
        displayId: DexId.Momentum,
        name: "Momentum",
        description: "Momentum is a next-gen DEX on Sui utilising the ve(3,3) tokenomics model and concentrated‑liquidity engine, positioning itself as a central liquidity infrastructure in the Sui ecosystem.",
        website: "https://mmt.finance/",
        iconUrl: "https://r2.starci.net/protocols/mmt.png",
    },
    {
        displayId: DexId.FlowX,
        name: "FlowX",
        description: "FlowX is a decentralized exchange on Sui designed for low-latency swaps and high throughput, aiming to leverage Sui’s parallel execution capabilities for efficient trading.",
        website: "https://flowx.finance/",
        iconUrl: "https://r2.starci.net/protocols/flowx.png",
    },
    {
        displayId: DexId.Raydium,
        name: "Raydium",
        description: "Raydium is a liquidity-provider and AMM-integrated DEX originally on Solana, and in this context appears on Sui — offering orderbook + AMM hybrid trading and deep liquidity.",
        website: "https://raydium.io/",
        iconUrl: "https://r2.starci.net/protocols/raydium.png",
    },
    {
        displayId: DexId.Orca,
        name: "Orca",
        description: "Orca is a user-friendly AMM DEX known for its simple UI and low fees; here it is listed on Sui ecosystem as a supported exchange with pools for users seeking ease of use.",
        website: "https://orca.so/",
        iconUrl: "https://r2.starci.net/protocols/orca.png",
    },
    {
        displayId: DexId.Meteora,
        name: "Meteora",
        description: "Meteora is a decentralized exchange on Sui providing advanced trading features and liquidity pool optimisation for more experienced DeFi users.",
        website: "https://meteora.finance/",
        iconUrl: "https://r2.starci.net/protocols/meteora.png",
    },
    {
        displayId: DexId.Saros,
        name: "Saros",
        description: "Saros is a DEX on the Sui blockchain focused on optimised liquidity pools, yield farming opportunities and community-driven trading experience.",
        website: "https://saros.finance/",
        iconUrl: "https://r2.starci.net/protocols/saros.png",
    },
]