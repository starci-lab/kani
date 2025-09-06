import { Injectable } from "@nestjs/common"
import { MemDbService } from "./memdb.service"
import { TokenSchema } from "../schemas"
import { combinations } from "@modules/common"

@Injectable()
export class MemDbTokenUtilsService {
    constructor(private readonly memDbService: MemDbService) {}

    public enumerateTokenPairs(): Array<[TokenSchema, TokenSchema]> {
        return combinations(this.memDbService.tokens, 2).map(([token1, token2]) => [
            token1,
            token2,
        ])
    }
}
