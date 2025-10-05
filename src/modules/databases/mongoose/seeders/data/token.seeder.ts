import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { ChainId, createObjectId, DeepPartial, Network, TokenType } from "@modules/common"
import { TokenSchema } from "../../schemas"
import { InjectMongoose } from "../../mongoose.decorators" 
import { CexId, TokenId } from "../../../enums"

const data: Array<DeepPartial<TokenSchema>> = [
    {
        _id: createObjectId(TokenId.SuiUsdc),
        displayId: TokenId.SuiUsdc,
        name: "USDC",
        symbol: "USDC",
        tokenAddress:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        decimals: 6,
        coinMarketCapId: "usdc",
        coinGeckoId: "usd-coin",
        cexSymbols: {
            [CexId.Binance]: "USDCUSDT",
            [CexId.Gate]: "USDC_USDT",
        },
        chainId: ChainId.Sui,
        iconUrl:
      "https://r2.starci.net/tokens/usdc.png",
        projectUrl: "https://www.centre.io/",
        network: Network.Mainnet,
        cexIds: [CexId.Binance, CexId.Gate],
        whichCex: CexId.Binance,
        type: TokenType.StableUsdc,
        pythFeedId: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiCetus),
        displayId: TokenId.SuiCetus,
        name: "CETUS",
        symbol: "CETUS",
        tokenAddress:
      "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
        decimals: 9,
        coinMarketCapId: "cetus",
        coinGeckoId: "cetus-protocol",
        cexSymbols: {
            [CexId.Binance]: "CETUSUSDT",
            [CexId.Gate]: "CETUS_USDT",
        },
        chainId: ChainId.Sui,
        iconUrl: "https://r2.starci.net/tokens/cetus.png",
        projectUrl: "https://cetus.zone/",
        network: Network.Mainnet,
        cexIds: [CexId.Gate],
        whichCex: CexId.Gate,
        type: TokenType.Wrapper,
        pythFeedId: "0xe5b274b2611143df055d6e7cd8d93fe1961716bcd4dca1cad87a83bc1e78c1ef",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiNative),
        displayId: TokenId.SuiNative,
        name: "SUI",
        symbol: "SUI",
        chainId: ChainId.Sui,
        tokenAddress:
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
        decimals: 9,
        coinMarketCapId: "sui",
        coinGeckoId: "sui",
        cexSymbols: {
            [CexId.Binance]: "SUIUSDT",
            [CexId.Gate]: "SUI_USDT",
        },
        iconUrl: "https://r2.starci.net/tokens/sui.png",
        projectUrl: "https://sui.io/",
        network: Network.Mainnet,
        cexIds: [CexId.Binance, CexId.Gate],
        whichCex: CexId.Binance,
        type: TokenType.Native,
        pythFeedId: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiIka),
        displayId: TokenId.SuiIka,
        name: "IKA",
        symbol: "IKA",
        chainId: ChainId.Sui,
        tokenAddress:
      "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
        decimals: 9,
        coinMarketCapId: "ika",
        coinGeckoId: "ika",
        cexSymbols: {
            [CexId.Gate]: "IKA_USDT",
        },
        iconUrl: "https://r2.starci.net/tokens/ika.png",
        projectUrl: "https://ika.xyz/",
        network: Network.Mainnet,
        cexIds: [CexId.Gate],
        whichCex: CexId.Gate,
        type: TokenType.Wrapper,
        pythFeedId: "0x2b529621fa6e2c8429f623ba705572aa64175d7768365ef829df6a12c9f365f4",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiAlkimi),
        displayId: TokenId.SuiAlkimi,
        name: "ALKIMI",
        symbol: "ALKIMI",
        chainId: ChainId.Sui,
        tokenAddress:
      "0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489::alkimi::ALKIMI",
        decimals: 9,
        coinMarketCapId: "alkimi",
        coinGeckoId: "alkimi",
        cexSymbols: {
            [CexId.Gate]: "ALKIMI_USDT",
        },
        iconUrl:
      "https://r2.starci.net/tokens/alkimi.png",
        projectUrl: "https://alkimi.org/",
        network: Network.Mainnet,
        cexIds: [CexId.Gate],
        whichCex: CexId.Gate,
        type: TokenType.Wrapper,
        pythFeedId: "0x1b2deae525b02c52de4a411c4f37139931215d7cc754e57dd6c84387336ccc74",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiWalrus),
        displayId: TokenId.SuiWalrus,
        name: "WALRUS",
        symbol: "WALRUS",
        chainId: ChainId.Sui,
        tokenAddress:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
        decimals: 9,
        coinMarketCapId: "walrus-xyz",
        coinGeckoId: "walrus-2",
        cexSymbols: {
            [CexId.Gate]: "WAL_USDT",
        },
        iconUrl:
      "https://r2.starci.net/tokens/walrus.png",
        projectUrl: "https://www.walrus.xyz/",
        network: Network.Mainnet,
        cexIds: [CexId.Gate],
        whichCex: CexId.Gate,
        type: TokenType.Wrapper,
        pythFeedId: "0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiDeep),
        displayId: TokenId.SuiDeep,
        name: "DEEP",
        symbol: "DEEP",
        chainId: ChainId.Sui,
        tokenAddress:
      "0xdee9f43a24e3ecf35f9581e6ce46f2c826c27ba7d8a88e64e8a1bde4374d8b5e::deep::DEEP",
        decimals: 9,
        coinMarketCapId: "deepbook", // chuẩn trên CMC
        coinGeckoId: "deepbook",     // chuẩn trên CoinGecko
        cexSymbols: {
            [CexId.Gate]: "DEEP_USDT",
        },
        iconUrl: "https://r2.starci.net/tokens/deep.png",
        projectUrl: "https://deepbook.org/",
        network: Network.Mainnet,
        cexIds: [CexId.Gate],
        whichCex: CexId.Gate,
        type: TokenType.Wrapper,
        pythFeedId: "0x29bdd5248234e33bd93d3b81100b5fa32eaa5997843847e2c2cb16d7c6d9f7ff",
        selectable: true,
    },
    {
        displayId: TokenId.SuiEth,
        name: "ETH",
        symbol: "ETH",
        chainId: ChainId.Sui,
        tokenAddress:
      "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
        decimals: 8,
        coinMarketCapId: "ethereum",
        coinGeckoId: "ethereum",
        cexSymbols: {
            [CexId.Binance]: "ETHUSDT",
            [CexId.Gate]: "ETH_USDT",
        },
        iconUrl: "https://r2.starci.net/tokens/eth.png",
        projectUrl: "https://ethereum.org/",
        network: Network.Mainnet,
        cexIds: [CexId.Binance, CexId.Gate],
        whichCex: CexId.Binance,
        type: TokenType.Wrapper,
        pythFeedId: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", 
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiXStakedSui),
        displayId: TokenId.SuiXStakedSui,
        name: "X Staked SUI",
        symbol: "xSUI",
        chainId: ChainId.Sui,
        tokenAddress:
    "0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI",
        decimals: 8,
        iconUrl: "https://r2.starci.net/tokens/x_sui.webp",
        projectUrl: "https://ethereum.org/",
        network: Network.Mainnet,
        type: TokenType.LiquidStaking,
        selectable: false,
    },
]

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