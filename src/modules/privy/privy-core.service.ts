import { Injectable } from "@nestjs/common"
import { P256KeyPair, PrivyClient, generateP256KeyPair } from "@privy-io/node"
import { InjectPrivyClient } from "./privy.decorators"
import { ChainId } from "@typedefs"
import { MountStorageService } from "@modules/filesystem"
import { 
    KeyQuorum,
    WalletCreateParams,
} from "@privy-io/node/resources"

@Injectable()
export class PrivyCoreService {
    constructor(
    @InjectPrivyClient()
    private readonly privyClient: PrivyClient,
    private readonly mountStorageService: MountStorageService
    ) {}

    /**
     * Create a new wallet for the user
     * @param chainId - The chain id
     * @returns The wallet
     */
    async createWallet(
        {
            policyIds,
            additionalSigners,
            userId,
            chainId,
        }: CreateWalletParams
    ) {
        const owner: WalletCreateParams.PublicKeyOwner | WalletCreateParams.UserOwner = userId ? {
            user_id: userId,
        } : {
            public_key: this.mountStorageService.appConfig.privy.signer.publicKey,
        }
        return await this.privyClient
            .wallets()
            .create(
                {
                    policy_ids: policyIds,
                    owner,
                    chain_type: chainId,
                    additional_signers: additionalSigners.map((additionalSigner) => ({
                        signer_id: additionalSigner.signerId,
                        policy_ids: additionalSigner.policyIds,
                    }
                    )
                    ),
                }
            )
    }

    /**
     * Create a new signer for the wallet
     * @returns The signer
     */
    async createSigner(): Promise<PrivySignerResult> {
        const keyPair = await generateP256KeyPair()
        const keyQuorum = await this.privyClient.keyQuorums().create(
            {
                public_keys: [
                    // user public key
                    keyPair.publicKey, 
                    // server public key
                    this.mountStorageService.appConfig.privy.signer.publicKey,
                ],
            }
        )
        return {
            keyQuorum,
            keyPair,
        }
    }
}

export interface PrivySignerResult {
    keyQuorum: KeyQuorum
    keyPair: P256KeyPair
}

export interface CreateWalletParams {
    policyIds?: Array<string>
    chainId: ChainId
    additionalSigners: Array<AdditionalSigner>
    userId?: string
}

export interface AdditionalSigner {
    signerId: string
    policyIds?: Array<string>
}