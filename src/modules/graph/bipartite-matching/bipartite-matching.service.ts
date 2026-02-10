import {
    Injectable 
} from "@nestjs/common"
import typedarraypool from "@stdlib/array-pool"
import {
    TypedArrayPoolAllocationFailedException 
} from "@modules/exceptions"
import {
    BipartiteMatchingFindParams,
    BipartiteMatchingFindResult
} from "./types"

/**
 * Bipartite Matching Service
 * 
 * Provides logic for bipartite matching.
 */
@Injectable()
export class BipartiteMatchingService {
    find(
        { 
            n, 
            m, 
            edges 
        }: BipartiteMatchingFindParams
    ): BipartiteMatchingFindResult {
    // ===== allocate from typed array pool =====
        const g1 = typedarraypool(n,
            "int32")
        const g2 = typedarraypool(m,
            "int32")
        const dist = typedarraypool(n,
            "int32")
        const queue = typedarraypool(n,
            "int32")
        if (!g1 || !g2 || !dist || !queue) {
            throw new TypedArrayPoolAllocationFailedException({
                n,
                m
            })
        }

        // ===== adjacency list (normal array is fine) =====
        const adj: Array<Array<number>> = Array.from(
            {
                length: n 
            },
            () => []
        )

        for (const [u,
            v] of edges) {
            adj[u].push(v)
        }

        for (let i = 0; i < n; i++) {
            g1[i] = -1
            dist[i] = Infinity
        }
        for (let i = 0; i < m; i++) g2[i] = -1

        let dmax = Infinity

        const dfs = (v: number): boolean => {
            for (const u of adj[v]) {
                const pu = g2[u]
                if (pu < 0 || (dist[pu] === dist[v] + 1 && dfs(pu))) {
                    g1[v] = u
                    g2[u] = v
                    return true
                }
            }
            dist[v] = Infinity
            return false
        }

        let matching = 0

        while (true) {
            let qh = 0
            let qt = 0
            dmax = Infinity

            for (let i = 0; i < n; i++) {
                if (g1[i] < 0) {
                    dist[i] = 0
                    queue[qt++] = i
                } else {
                    dist[i] = Infinity
                }
            }

            while (qh < qt) {
                const v = queue[qh++]
                if (dist[v] < dmax) {
                    for (const u of adj[v]) {
                        const pu = g2[u]
                        if (pu < 0) {
                            dmax = dist[v] + 1
                        } else if (dist[pu] === Infinity) {
                            dist[pu] = dist[v] + 1
                            queue[qt++] = pu
                        }
                    }
                }
            }

            if (dmax === Infinity) break

            for (let i = 0; i < n; i++) {
                if (g1[i] < 0 && dfs(i)) {
                    matching++
                }
            }
        }

        const result: Array<Array<number>> = []
        for (let i = 0; i < n; i++) {
            if (g1[i] >= 0) result.push([i,
                g1[i]])
        }

        // ===== free to pool =====
        typedarraypool.free(queue)
        typedarraypool.free(dist)
        typedarraypool.free(g1)
        typedarraypool.free(g2)

        return {
            matching,
            result
        }
    }
}
