import { CommandRunner, SubCommand } from "nest-commander"
import { faker } from "@faker-js/faker"
import { LiquidityPoolId } from "@modules/databases/mongodb/primary/enums"
import { createObjectId } from "@utils"
import { PositionSchema } from "@modules/databases"
import { ChainId, DeepPartial } from "@typedefs"
@SubCommand(
    { 
        name: "positions", 
        aliases: [ "pos" ], 
        description: "Simulate positions" 
    })
export class SimulatePositionsCommand extends CommandRunner {
    async run(): Promise<void> {
        console.log("Simulating positions")
    }

    private position(): DeepPartial<PositionSchema> {
        const liquidityPoolIds: Array<LiquidityPoolId> = [
            LiquidityPoolId.OrcaSolUsdc004,
            LiquidityPoolId.MeteoraSolUsdcBinStep4,
            LiquidityPoolId.RaydiumSolUsdc004,
        ]
        const openedAt = faker.date.past()
        return {
            openTxHash: faker.string.hexadecimal({ length: 64 }),
            liquidityPool: createObjectId(
                faker.helpers.arrayElement(liquidityPoolIds)
            ),
            snapshotTargetBalanceAmountBeforeOpen: faker.number.bigInt(
                { min: BigInt("100_000_000"), 
                    max: BigInt("1_000_000_000") 
                }).toString(),
            snapshotQuoteBalanceAmountBeforeOpen: faker.number.bigInt({ 
                min: BigInt("100_000_000"), 
                max: BigInt("1_000_000_000") 
            }).toString(),
            snapshotGasBalanceAmountBeforeOpen: faker.number.bigInt({ 
                min: BigInt("100_000_000"), 
                max: BigInt("1_000_000_000") 
            }).toString(),
            snapshotTargetBalanceAmountAfterClose: faker.number.bigInt({ 
                min: BigInt("100_000_000"), 
                max: BigInt("1_000_000_000") 
            }).toString(),
            snapshotQuoteBalanceAmountAfterClose: faker.number.bigInt({ 
                min: BigInt("100_000_000"), 
                max: BigInt("1_000_000_000") 
            }).toString(),
            snapshotGasBalanceAmountAfterClose: faker.number.bigInt({ 
                min: BigInt("100_000_000"), 
                max: BigInt("1_000_000_000") 
            }).toString(),
            liquidity: faker.number.bigInt({ 
                min: BigInt("1_000_000_000"), 
                max: BigInt("10_000_000_000") 
            }).toString(),
            tickLower: faker.number.int({ min: -50000, max: -100 }),
            tickUpper: faker.number.int({ min: 100, max: 50000 }),
            amountA: faker.number.bigInt({ 
                min: BigInt("1"), 
                max: BigInt("1_000_000") 
            }).toString(),
            amountB: faker.number.bigInt({ 
                min: BigInt("1"), 
                max: BigInt("1_000_000") 
            }).toString(),
            minBinId: faker.number.int({ min: 1, max: 1000 }),
            maxBinId: faker.number.int({ min: 1001, max: 2000 }),
            chainId: ChainId.Solana,
            targetIsA: true,
            positionOpenedAt: openedAt,
            positionId: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            closeTxHash: faker.string.hexadecimal({ length: 64 }),
            positionClosedAt: faker.date.between({ from: openedAt, to: new Date() }),
            roi: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
            pnl: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
            feeAmountTarget: faker.number.bigInt({ 
                min: BigInt("1"), 
                max: BigInt("1_000_000") 
            }).toString(),
            feeAmountQuote: faker.number.bigInt({ 
                min: BigInt("1"), 
                max: BigInt("1_000_000") 
            }).toString(),
            isSimulated: true,
        }
    }
}