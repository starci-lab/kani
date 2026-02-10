import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import * as fs from "fs"
import * as path from "path"
import {
    BipartiteMatchingService 
} from "@modules/graph"

/* ================= APP ================= */

@Injectable()
export class AppService implements OnModuleInit {
    constructor(
        private readonly bipartiteMatchingService: BipartiteMatchingService
    ) {}
    async onModuleInit() {
        const filePath = path.join(process.cwd(),
            "dataset.json")
        const dataset: Record<string, string[]> = JSON.parse(
            fs.readFileSync(filePath,
                "utf-8")
        )

        const result = this.solve(dataset)
        console.log("FINAL ASSIGNMENT:")
        console.dir(result,
            {
                depth: null 
            })
    }

    solve(data: Record<string, string[]>) {
        const MAX_PER_USER = 2
        const users = Object.keys(data)
      
        // đếm food
        const foodCounts: Record<string, number> = {
        }
        Object.values(data).flat().forEach(f => {
            foodCounts[f] = (foodCounts[f] || 0) + 1
        })
      
        const userSlots: string[] = []
        const foodSlots: string[] = []
      
        users.forEach(u => {
            for (let i = 0; i < MAX_PER_USER; i++) {
                userSlots.push(`${u}#${i}`)
            }
        })
      
        Object.entries(foodCounts).forEach(([food,
            count]) => {
            for (let i = 0; i < count; i++) {
                foodSlots.push(`${food}#${i}`)
            }
        })
      
        const U = userSlots.length
        const V = foodSlots.length
      
        const uIndex = new Map<string, number>()
        const vIndex = new Map<string, number>()
      
        userSlots.forEach((u, i) => uIndex.set(u,
            i))
        foodSlots.forEach((f, i) => vIndex.set(f,
            i))
      
        // ===== BUILD EDGES (instead of adj) =====
        const edges: number[][] = []
      
        for (const [user,
            foods] of Object.entries(data)) {
            for (let i = 0; i < MAX_PER_USER; i++) {
                const uSlot = `${user}#${i}`
                const u = uIndex.get(uSlot)!
      
                for (const food of foods) {
                    for (let k = 0; k < foodCounts[food]; k++) {
                        const vSlot = `${food}#${k}`
                        const v = vIndex.get(vSlot)!
                        edges.push([u,
                            v])
                    }
                }
            }
        }
      
        // ===== CALL SERVICE =====
        const { result: matching } =
          this.bipartiteMatchingService.find({
              n: U,
              m: V,
              edges
          })
      
        // ===== MAP BACK =====
        const result: Record<string, string[]> = {
        }
        users.forEach(u => (result[u] = []))
      
        for (const [u,
            v] of matching) {
            const userSlot = userSlots[u]
            const foodSlot = foodSlots[v]
      
            const user = userSlot.split("#")[0]
            const food = foodSlot.split("#")[0]
      
            result[user].push(food)
        }
      
        return result
    }
}