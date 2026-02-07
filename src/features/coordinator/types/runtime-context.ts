/** Params for refreshing executor state. */
export interface RefreshExecutorParams {
    event?: unknown
}

/** Result of refreshing executor state. */
export type RefreshExecutorResult = void

/** Params for initializing runtime context. */
export type InitializeParams = Record<string, never>

/** Result of initializing runtime context. */
export type InitializeResult = void

/** Params for reconciling deployment. */
export type ReconcileDeploymentParams = Record<string, never>

/** Result of reconciling deployment. */
export type ReconcileDeploymentResult = void

/** Params for reconciling service. */
export type ReconcileServiceParams = Record<string, never>

/** Result of reconciling service. */
export type ReconcileServiceResult = void

/** Params for disposing runtime context. */
export interface DisposeParams {
    withDestroy?: boolean
}

/** Result of disposing runtime context. */
export type DisposeResult = void

/** Params for destroying runtime context. */
export type DestroyParams = Record<string, never>

/** Result of destroying runtime context. */
export type DestroyResult = void
