import {
    Module
} from "@nestjs/common"
//import { ComputeSwapAmountsService } from "./compute-swap-amounts.service"
import {
    EnvModule
} from "@modules/env"
import {
    FilesystemModule
} from "@modules/filesystem"
import {
    MixinModule
} from "@modules/mixin"
import {
    PrimaryMongoDbModule
} from "@modules/databases"
import {
    CacheModule
} from "@modules/cache"
import {
    WinstonModule, WinstonLevel
} from "@modules/winston"
import {
    AxiosModule
} from "@modules/axios"
import {
    StreamAsyncIteratorModule
} from "@modules/stream-async-iterator"
import {
    CexesModule, PriceFeedsModule 
} from "@modules/blockchains"
import {
    MathModule 
} from "@modules/blockchains"
import { FormulasModule } from "@modules/blockchains"
import { MathService } from "./math.service"

@Module({
    imports: [
        // EnvModule.forRoot(),
        // MixinModule.register({
        //     isGlobal: true,
        // }),
        // FilesystemModule.register({
        //     isGlobal: true,
        // }),
        // PrimaryMongoDbModule.register({
        //     isGlobal: true,
        //     memoryStorage: true,
        // }),
        // WinstonModule.register({
        //     isGlobal: true,
        //     appName: "kani-algorithm-tests",
        //     level: WinstonLevel.Verbose,
        // }),
        // MixinModule.register({
        //     isGlobal: true,
        // }),
        // CacheModule.register({
        //     isGlobal: true,
        // }),
        // StreamAsyncIteratorModule.register({
        //     isGlobal: true,
        // }),
        // CexesModule.register({
        //     isGlobal: true,
        // }),
        // AxiosModule.register({
        //     isGlobal: true,
        // }),
        // PriceFeedsModule.register({
        //     isGlobal: true,
        // }),
        // FormulasModule.register({
        //     isGlobal: true,
        // }),
        // MathModule.register({
        //     isGlobal: true,
        // }),
        // AxiosModule.register({
        //     isGlobal: true,
        // }),
        // EventEmitterModule.forRoot(),
        // EventModule.register({
        //     isGlobal: true,
        // }),
        // P2CBalancerModule.register({
        //     isGlobal: true,
        // }),
        // ClientsModule.register({
        //     isGlobal: true,
        // }),
        // GcpModule.register({
        //     isGlobal: true,
        // }),
        // CryptoModule.register({
        //     isGlobal: true,
        // }),
        // DerivedModule.register({
        //     isGlobal: true,
        // }),
        // PrivyModule.register({
        //     isGlobal: true,
        // }),
        // AxiosModule.register({
        //     isGlobal: true,
        // }),
        // ApolloClientModule.register({
        //     isGlobal: true,
        // }),
        // SignersModule.register({
        //     isGlobal: true,
        // }),
        // TxBuilderModule.register({
        //     isGlobal: true,
        // }),
        // LeaseModule.register({
        //     isGlobal: true,
        // }),
        // ExitStrategyEngineModule.register({
        //     isGlobal: true,
        // }),
        // BalanceModule.register({
        //     isGlobal: true,
        //     utilitiesOnly: true,
        // }),
        // BullModule.forRoot({
        //     isGlobal: true,
        // }),
        // DexesModule.register({
        //     isGlobal: true,
        //     dexIds: [
        //         DexId.Cetus,
        //         DexId.Turbos,
        //         DexId.Momentum,
        //         DexId.FlowX,
        //         DexId.Raydium,
        //         DexId.Orca,
        //         DexId.Meteora,
        //         DexId.Saros,
        //     ],
        //     enabled: {
        //         fees: true,
        //     },
        // }),
        // MixinModule.register({
        //     isGlobal: true,
        // }),
        // FormulasModule.register({
        //     isGlobal: true,
        // }),
        // MathModule.register({
        //     isGlobal: true,
        // }),
    ],
    providers: [
        //ComputeSwapAmountsService,
        // RpcTestsService,
        // FeesTestService,
        // TickBoundsService,
        MathService,
    ],
})
export class AppModule { }
