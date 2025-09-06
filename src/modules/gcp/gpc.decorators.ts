import { Inject } from "@nestjs/common"
import { GCP_KMS_CLIENT, GCP_SECRET_CLIENT } from "./gcp.constants"

export const InjectGcpKmsClient = () => Inject(GCP_KMS_CLIENT)
export const InjectGcpSecretClient = () => Inject(GCP_SECRET_CLIENT)    