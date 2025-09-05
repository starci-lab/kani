import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { ChainId, createObjectId, Network } from "@modules/common"
import { TokenSchema } from "../../schemas"
import { TokenId } from "../../enums"
import { InjectMongoose } from "../../mongoose.decorators"

@Injectable()
export class TokenSeeder implements Seeder {
    private readonly logger = new Logger(TokenSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection
    ) { }

    public async seed(): Promise<void> {
        this.logger.debug("Seeding tokens...")
        await this.drop()

        const data: Array<Partial<TokenSchema>> = [
            {
                _id: createObjectId(TokenId.SuiUsdc),
                name: "USDC",
                symbol: "USDC",
                displayId: TokenId.SuiUsdc,
                tokenAddress:
                    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
                decimals: 6,
                coinMarketCapId: "usdc",
                coinGeckoId: "usd-coin",
                chainId: ChainId.Sui,
                iconUrl:
                    "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042194",
                projectUrl: "https://www.centre.io/",
                network: Network.Mainnet,
            },
            {
                _id: createObjectId(TokenId.SuiCetus),
                name: "CETUS",
                symbol: "CETUS",
                displayId: TokenId.SuiCetus,
                tokenAddress:
                    "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
                decimals: 9,
                coinMarketCapId: "cetus",
                coinGeckoId: "cetus-protocol",
                chainId: ChainId.Sui,
                iconUrl: "https://assets.coingecko.com/coins/images/32311/large/cetus.png",
                projectUrl: "https://cetus.zone/",
                network: Network.Mainnet,
            },
            {
                _id: createObjectId(TokenId.SuiNative),
                name: "SUI",
                symbol: "SUI",
                displayId: TokenId.SuiNative,
                chainId: ChainId.Sui,
                tokenAddress:
                    "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
                decimals: 9,
                coinMarketCapId: "sui",
                coinGeckoId: "sui",
                iconUrl: "https://assets.coingecko.com/coins/images/18884/large/Sui.png",
                projectUrl: "https://sui.io/",
                network: Network.Mainnet,
            },
            {
                _id: createObjectId(TokenId.SuiIka),
                name: "IKA",
                symbol: "IKA",
                displayId: TokenId.SuiIka,
                chainId: ChainId.Sui,
                tokenAddress:
                    "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
                decimals: 9,
                coinMarketCapId: "ika",
                coinGeckoId: "ika",
                iconUrl: "https://assets.coingecko.com/coins/images/31447/large/Ika.png",
                projectUrl: "https://ika.xyz/",
                network: Network.Mainnet,
            },
            {
                _id: createObjectId(TokenId.SuiAlkimi),
                name: "ALKIMI",
                symbol: "ALKIMI",
                displayId: TokenId.SuiAlkimi,
                chainId: ChainId.Sui,
                tokenAddress:
                    "0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489::alkimi::ALKIMI",
                decimals: 9,
                coinMarketCapId: "alkimi",
                coinGeckoId: "alkimi",
                iconUrl: "https://assets.coingecko.com/coins/images/32973/large/alkimi.png",
                projectUrl: "https://alkimi.org/",
                network: Network.Mainnet,
            },
            {
                _id: createObjectId(TokenId.SuiWalrus),
                name: "WALRUS",
                symbol: "WALRUS",
                displayId: TokenId.SuiWalrus,
                chainId: ChainId.Sui,
                tokenAddress:
                    "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
                decimals: 9,
                coinMarketCapId: "walrus-xyz",
                coinGeckoId: "walrus-2",
                iconUrl:
                    "https://assets.coingecko.com/coins/images/31453/large/Walrus.png",
                projectUrl: "https://www.walrus.xyz/",
                network: Network.Mainnet,
            },
        ]

        try {
            await this.connection
                .model<TokenSchema>(TokenSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} tokens successfully`)
        } catch (error) {
            this.logger.error("Failed to seed tokens", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing tokens...")
        const result = await this.connection
            .model<TokenSchema>(TokenSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} tokens`)
    }
}