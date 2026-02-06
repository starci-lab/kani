import {
    CreateAxiosDefaults,
} from "axios"

/** Parameters for creating an Axios instance. */
export interface AxiosCreateParams {
    key: string
    config?: CreateAxiosDefaults
}
