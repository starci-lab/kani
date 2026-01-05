import {
    IReservesService,
    ReservesParams,
    ReservesResponse,
} from "../../interfaces"
import { Decimal } from "decimal.js"
import { Injectable } from "@nestjs/common"
import { ActivePositionNotFoundException } from "@exceptions"

@Injectable()
export class MeteoraReservesService implements IReservesService {
    constructor() {}

    async reserves({
        bot,
    }: ReservesParams): Promise<ReservesResponse> {
        if (!bot.activePosition) throw new ActivePositionNotFoundException("Active position not found")
        return {
            tokenA: new Decimal(0),
            tokenB: new Decimal(0),
        }
    }
}