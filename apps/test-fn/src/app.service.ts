import { Injectable, OnModuleInit } from "@nestjs/common"
import { BinanceProcessorService, GateProcessorService } from "@modules/blockchains"
//import { TokenId } from "@modules/databases"
//import { tokenData } from "@modules/databases/data"

@Injectable()
export class AppService implements OnModuleInit {
    constructor(
        private readonly binanceProcessorService: BinanceProcessorService,
        private readonly gateProcessorService: GateProcessorService,
    ) { }

    onModuleInit() {
        //const tokens = tokenData
        // Initialized
        // this.binanceProcessorService.initialize([
        //     TokenId.SuiNative
        // ],
        // tokens)
        // this.gateProcessorService.initialize([
        //     TokenId.SuiNative
        // ],
        // tokens)
    }
}