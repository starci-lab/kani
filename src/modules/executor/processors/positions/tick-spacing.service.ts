import { PrimaryMemoryStorageService } from "@modules/databases"
import { Injectable } from "@nestjs/common"

@Injectable()
export class TickSpacingService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}
}