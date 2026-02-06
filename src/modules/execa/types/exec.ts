/** Params for running a shell command. */
export interface ExecParams {
    command: string
    args?: Array<string>
}

/** Result of exec (stdout as string). */
export type ExecResult = string
