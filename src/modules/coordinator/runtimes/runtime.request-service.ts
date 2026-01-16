import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { K8SDeploymentService, K8SServiceService } from "../bussiness"

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class RuntimeRequestService {
    constructor(
        @Inject(REQUEST)
        private readonly request: RuntimeRequest,
        private readonly k8sDeploymentService: K8SDeploymentService,
        private readonly k8sServiceService: K8SServiceService,
    ) {}

    /**
     * Initialize the runtime request service
     */
    async init() {
        // call the initialize method of the service
        // we either create or patch the deployment and service by 
    }

    /**
     * Destroy the runtime request service
     */
    async destroy() {
        // call the destroy method of the service
        console.log("Destroying runtime request service for executor", this.request.id)
    }
}   

export interface RuntimeRequest {
    id: string
}