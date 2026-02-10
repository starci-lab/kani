/**
 * Bipartite Matching Find Parameters
 * 
 * Parameters for finding the maximum matching in a bipartite graph.
 */
export interface BipartiteMatchingFindParams {
    n: number
    m: number
    edges: Array<Array<number>>
}
/**
 * Bipartite Matching Find Result
 * 
 * Result of finding the maximum matching in a bipartite graph.
 */
export interface BipartiteMatchingFindResult {
    matching: number
    result: Array<Array<number>>
}