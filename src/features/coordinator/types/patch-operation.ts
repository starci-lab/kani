/** JSON Patch operation for Kubernetes resource updates. */
export interface PatchOperation {
    op: "replace" | "add" | "remove"
    path: string
    value: unknown
}
