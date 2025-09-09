import { Injectable, OnModuleInit } from "@nestjs/common"
import { BinanceProcessorService } from "@modules/blockchains"

@Injectable()
export class AppService implements OnModuleInit {
    constructor(
    private readonly binanceProcessorService: BinanceProcessorService,
    ) {}

    onModuleInit() {
    // Khởi tạo processor với danh sách symbol muốn theo dõi
        this.binanceProcessorService.initialize([
            "SUIUSDT",
        ])
    }
}