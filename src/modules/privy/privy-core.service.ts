import {
    Injectable
} from "@nestjs/common"
import {
    PrivyClient,
    generateP256KeyPair
} from "@privy-io/node"
import {
    WalletCreateParams
} from "@privy-io/node/resources"
import {
    InjectPrivyClient
} from "./privy.decorators"
import {
    MountStorageService
} from "@modules/filesystem"
import type {
    CreateWalletParams,
    PrivySignerResult
} from "./types"

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