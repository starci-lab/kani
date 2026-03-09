import {
    CexId,
    MarketListingId,
    TokenId 
} from "../enums"
import {
    ChainId, DeepPartial, TokenType
} from "@modules/common"
import {
    TokenSchema 
} from "../schemas"
import {
    Seeder 
} from "./types"
import {
    InjectPrimaryMongoose 
} from "../mongodb.decorators"
import type {
    ClientSession 
} from "mongoose"
import {
    Connection 
} from "mongoose"
import {
    Injectable 
} from "@nestjs/common"
import {
    createObjectId 
} from "@modules/common"

@Injectable()
export class TokensService implements Seeder {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async seed(session?: ClientSession): Promise<void> {
        await this.connection.model<TokenSchema>(TokenSchema.name).create(data,
            {
                ordered: true,
                ...(session && {
                    session 
                }) 
            })
    }

    async drop(session?: ClientSession): Promise<void> {
        await this.connection.model<TokenSchema>(TokenSchema.name).deleteMany({
        },
        {
            ...(session && {
                session 
            }) 
        })
    }
}   

const data: Array<DeepPartial<TokenSchema>> = [
    {
        _id: createObjectId(TokenId.SuiUsdc),
        displayId: TokenId.SuiUsdc,
        name: "USDC",
        symbol: "USDC",
        tokenAddress:
          "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        decimals: 6,
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "usdcusdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "3408",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "usd-coin",
                priority: 3,
            },
            {
                id: MarketListingId.Bybit,
                symbol: "USDCUSDT",
                priority: 4,
            },
            {
                id: MarketListingId.Gate,
                symbol: "USDC_USDT",
                priority: 5,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
                priority: 6,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Bybit,
            CexId.Gate,
        ],
        chainId: ChainId.Sui,
        iconUrl: "https://r2.kanibot.xyz/tokens/usdc.png",
        projectUrl: "https://www.centre.io/",
        type: TokenType.StableCoin,
        isUsdt: false,
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
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "cetususdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "25114",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "cetus-protocol",
                priority: 3,
            },
            {
                id: MarketListingId.Gate,
                symbol: "CETUS_USDT",
                priority: 4,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xe5b274b2611143df055d6e7cd8d93fe1961716bcd4dca1cad87a83bc1e78c1ef",
                priority: 5,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Gate,
        ],
        chainId: ChainId.Sui,
        iconUrl: "https://r2.kanibot.xyz/tokens/cetus.png",
        projectUrl: "https://cetus.zone/",
        type: TokenType.Wrapper,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiNative),
        displayId: TokenId.SuiNative,
        name: "SUI",
        symbol: "SUI",
        chainId: ChainId.Sui,
        tokenAddress: "0x2::sui::SUI",
        decimals: 9,
        type: TokenType.Native,
        isUsdt: false,
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "suiusdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "20947",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "sui",
                priority: 3,
            },
            {
                id: MarketListingId.Bybit,
                symbol: "SUIUSDT",
                priority: 4,
            },
            {
                id: MarketListingId.Gate,
                symbol: "SUI_USDT",
                priority: 5,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
                priority: 6,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Bybit,
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/sui.png",
        projectUrl: "https://sui.io/",
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiFlowx),
        displayId: TokenId.SuiFlowx,
        name: "FlowX",
        symbol: "FLX",
        chainId: ChainId.Sui,
        tokenAddress: "0x6dae8ca14311574fdfe555524ea48558e3d1360d1607d1c7f98af867e3b7976c::flx::FLX",
        decimals: 8,
        marketListings: [
            {
                id: MarketListingId.Coingecko,
                symbol: "flowx-finance",
                priority: 1,
            },
        ],
        trackedCexIds: [],
        iconUrl: "https://r2.kanibot.xyz/tokens/flowx.jpg",
        projectUrl: "https://flowx.finance/",
        type: TokenType.Regular,
        isUsdt: false,
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
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "37454",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "ika",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "IKA_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x2b529621fa6e2c8429f623ba705572aa64175d7768365ef829df6a12c9f365f4",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/ika.png",
        projectUrl: "https://ika.xyz/",
        type: TokenType.Regular,
        isUsdt: false,
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
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "38131",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "alkimi",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "ALKIMI_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x1b2deae525b02c52de4a411c4f37139931215d7cc754e57dd6c84387336ccc74",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/alkimi.png",
        projectUrl: "https://alkimi.org/",
        type: TokenType.Wrapper,
        isUsdt: false,
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
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "36119",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "walrus-2",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "WAL_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/walrus.png",
        projectUrl: "https://www.walrus.xyz/",
        type: TokenType.Wrapper,
        isUsdt: false,
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
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "33391",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "deep",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "DEEP_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x29bdd5248234e33bd93d3b81100b5fa32eaa5997843847e2c2cb16d7c6d9f7ff",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/deep.png",
        projectUrl: "https://deepbook.org/",
        type: TokenType.Wrapper,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiEth),
        displayId: TokenId.SuiEth,
        name: "ETH",
        symbol: "ETH",
        chainId: ChainId.Sui,
        tokenAddress:
          "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
        decimals: 8,
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "ethusdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "1027",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "ethereum",
                priority: 3,
            },
            {
                id: MarketListingId.Bybit,
                symbol: "ETHUSDT",
                priority: 4,
            },
            {
                id: MarketListingId.Gate,
                symbol: "ETH_USDT",
                priority: 5,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                priority: 6,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Bybit,
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/eth.png",
        projectUrl: "https://ethereum.org/",
        type: TokenType.Wrapper,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiXStakedSui),
        displayId: TokenId.SuiXStakedSui,
        name: "X Staked SUI",
        symbol: "xSUI",
        chainId: ChainId.Sui,
        tokenAddress: "0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI",
        decimals: 8,
        marketListings: [],
        trackedCexIds: [],
        iconUrl: "https://r2.kanibot.xyz/tokens/x_sui.webp",
        projectUrl: "https://ethereum.org/",
        type: TokenType.LiquidStaking,
        isUsdt: false,
        selectable: false,
    },
    {
        _id: createObjectId(TokenId.SolNative),
        displayId: TokenId.SolNative,
        name: "SOL",
        symbol: "SOL",
        decimals: 9,
        chainId: ChainId.Solana,
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "solusdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "5426",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "solana",
                priority: 3,
            },
            {
                id: MarketListingId.Bybit,
                symbol: "SOLUSDT",
                priority: 4,
            },
            {
                id: MarketListingId.Gate,
                symbol: "SOL_USDT",
                priority: 5,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
                priority: 6,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Bybit,
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/sol.png",
        projectUrl: "https://solana.com/",
        type: TokenType.Native,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SolUsdc),
        displayId: TokenId.SolUsdc,
        name: "USDC",
        symbol: "USDC",
        decimals: 6,
        selectable: true,
        chainId: ChainId.Solana,
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        marketListings: [
            {
                id: MarketListingId.Binance,
                symbol: "usdcusdt",
                priority: 1,
            },
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "3408",
                priority: 2,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "usd-coin",
                priority: 3,
            },
            {
                id: MarketListingId.Bybit,
                symbol: "USDCUSDT",
                priority: 4,
            },
            {
                id: MarketListingId.Gate,
                symbol: "USDC_USDT",
                priority: 5,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
                priority: 6,
            },
        ],
        trackedCexIds: [
            CexId.Binance,
            CexId.Bybit,
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/usdc.png",
        projectUrl: "https://www.centre.io/",
        type: TokenType.StableCoin,
        isUsdt: false,
    },
    {
        _id: createObjectId(TokenId.SolUsdt),
        displayId: TokenId.SolUsdt,
        name: "USDT",
        symbol: "USDT",
        decimals: 6,
        isUsdt: true,
        tokenAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        chainId: ChainId.Solana,
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "825",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "tether",
                priority: 2,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
                priority: 4,
            },
        ],
        trackedCexIds: [],
        iconUrl: "https://r2.kanibot.xyz/tokens/usdt.png",
        projectUrl: "https://tether.to/",
        type: TokenType.StableCoin,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SolRay),
        displayId: TokenId.SolRay,
        name: "RAY",
        symbol: "RAY",
        decimals: 6,
        chainId: ChainId.Solana,
        tokenAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        iconUrl: "https://r2.kanibot.xyz/tokens/ray.png",
        projectUrl: "https://raydium.io/",
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "8526",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "raydium",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "RAY_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        type: TokenType.Regular,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SolOrca),
        displayId: TokenId.SolOrca,
        name: "Orca",
        symbol: "ORCA",
        chainId: ChainId.Solana,
        tokenAddress: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
        decimals: 6,
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "11165",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "orca",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "ORCA_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0x37505261e557e251290b8c8899453064e8d760ed5c65a779726f2490980da74c",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
        iconUrl: "https://r2.kanibot.xyz/tokens/orca.png",
        projectUrl: "https://orca.so",
        type: TokenType.Regular,
        isUsdt: false,
        selectable: true,
    },
    {
        _id: createObjectId(TokenId.SuiTurbos),
        displayId: TokenId.SuiTurbos,
        name: "TURBOS",
        symbol: "TURBOS",
        chainId: ChainId.Sui,
        tokenAddress: "0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c355171f84bb1ba4a::turbos::TURBOS",
        decimals: 9,
        iconUrl: "https://r2.kanibot.xyz/tokens/turbos.svg",
        projectUrl: "https://turbos.finance/",
        type: TokenType.Regular,
        isUsdt: false,
        selectable: true,
        marketListings: [
            {
                id: MarketListingId.CoinMarketCap,
                symbol: "25179",
                priority: 1,
            },
            {
                id: MarketListingId.Coingecko,
                symbol: "turbos-finance",
                priority: 2,
            },
            {
                id: MarketListingId.Gate,
                symbol: "TURBOS_USDT",
                priority: 3,
            },
            {
                id: MarketListingId.Pyth,
                symbol: "0xf9c2e890443dd995d0baafc08eea3358be1ffb874f93f99c30b3816c460bbac3",
                priority: 4,
            },
        ],
        trackedCexIds: [
            CexId.Gate,
        ],
    },
]
