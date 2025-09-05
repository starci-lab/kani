import _ from "lodash"

// CkN, generate all combinations of k elements from an array
export const combinations = <T>(arr: Array<T>, k = 2): Array<Array<T>> => {
    if (k === 0) return [[]]
    if (k > arr.length) return []

    return _.flatMap(arr, (v, i) => {
        const rest = arr.slice(i + 1)
        return combinations(rest, k - 1).map((combo) => [v, ...combo])
    })
}