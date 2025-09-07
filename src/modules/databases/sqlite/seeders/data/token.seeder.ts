import { Injectable, Logger } from "@nestjs/common"
import { DataSource } from "typeorm"
import { TokenEntity } from "../../entities"
import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases/enums"

@Injectable()
export class TokenSeeder {
    private readonly logger = new Logger(TokenSeeder.name)
    constructor(private readonly dataSource: DataSource) {}

    async seed(): Promise<void> {
        this.logger.debug("Seeding tokens (sqlite)...")
        const repo = this.dataSource.getRepository(TokenEntity)
        await repo.save(
            repo.create([
                {
                    displayId: TokenId.SuiUsdc,
                    name: "USDC",
                    symbol: "USDC",
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
                    displayId: TokenId.SuiCetus,
                    name: "CETUS",
                    symbol: "CETUS",
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
                    displayId: TokenId.SuiNative,
                    name: "SUI",
                    symbol: "SUI",
                    tokenAddress:
                        "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
                    decimals: 9,
                    coinMarketCapId: "sui",
                    coinGeckoId: "sui",
                    chainId: ChainId.Sui,
                    iconUrl: "https://assets.coingecko.com/coins/images/18884/large/Sui.png",
                    projectUrl: "https://sui.io/",
                    network: Network.Mainnet,
                },
                {
                    displayId: TokenId.SuiIka,
                    name: "IKA",
                    symbol: "IKA",
                    tokenAddress:
                        "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
                    decimals: 9,
                    coinMarketCapId: "ika",
                    coinGeckoId: "ika",
                    chainId: ChainId.Sui,
                    iconUrl: "https://assets.coingecko.com/coins/images/31447/large/Ika.png",
                    projectUrl: "https://ika.xyz/",
                    network: Network.Mainnet,
                },
                {
                    displayId: TokenId.SuiAlkimi,
                    name: "ALKIMI",
                    symbol: "ALKIMI",
                    tokenAddress:
                        "0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489::alkimi::ALKIMI",
                    decimals: 9,
                    coinMarketCapId: "alkimi",
                    coinGeckoId: "alkimi",
                    chainId: ChainId.Sui,
                    iconUrl: "https://assets.coingecko.com/coins/images/32973/large/alkimi.png",
                    projectUrl: "https://alkimi.org/",
                    network: Network.Mainnet,
                },
                {
                    displayId: TokenId.SuiWalrus,
                    name: "WALRUS",
                    symbol: "WALRUS",
                    tokenAddress:
                        "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
                    decimals: 9,
                    coinMarketCapId: "walrus-xyz",
                    coinGeckoId: "walrus-2",
                    chainId: ChainId.Sui,
                    iconUrl: "https://assets.coingecko.com/coins/images/31453/large/Walrus.png",
                    projectUrl: "https://www.walrus.xyz/",
                    network: Network.Mainnet,
                },
            ]),
        )
    }

    async drop(): Promise<void> {
        const repo = this.dataSource.getRepository(TokenEntity)
        await repo.delete({})
    }
}


