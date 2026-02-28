/**
 * Returns all possible combinations of k elements from the array.
 */
export const combinations = <T>(arr: Array<T>, k: number): Array<Array<T>> => {
    /** The result of the combinations. */
    const result: Array<Array<T>> = []
  
    /** The backtrack function. */
    const backtrack = (start: number, path: Array<T>) => {
        /** If the path length is equal to k, push the path to the result. */
        if (path.length === k) {
            result.push([...path])
            return
        }
  
        /** For each element in the array, push the element to the path and call the backtrack function. */
        for (let i = start; i < arr.length; i++) {
            path.push(arr[i])
            backtrack(i + 1,
                path)
            path.pop()
        }
    }
    /** Call the backtrack function. */
    backtrack(0,
        [])
    return result
}