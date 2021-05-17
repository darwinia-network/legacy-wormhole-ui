import axios from "axios";
import Web3 from "web3";
import transferBridgeABI from "../abi/Backing.json";
import mappingTokenABI from "../abi/MappingToken.json";
import configJson from "../config.json";
import { tokenInfoGetter, getNameAndLogo } from "./token-util";
import { getTokenBalance } from "./token-util";
import { getMPTProof, isNetworkMatch } from "../utils";
import { Subject } from "rxjs";

const config = configJson[process.env.REACT_APP_CHAIN];
const { backingContract, mappingContract } = (() => {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);
    const backingContract = new web3.eth.Contract(
        transferBridgeABI,
        config.TRANSFER_BRIDGE_ETH_ADDRESS
    );
    const web3Darwinia = new Web3(config.DARWINIA_PROVIDER);
    const mappingContract = new web3Darwinia.eth.Contract(
        mappingTokenABI,
        config.MAPPING_FACTORY_ADDRESS
    );

    return {
        backingContract,
        mappingContract,
        web3,
    };
})();

const proofSubject = new Subject();

/**
 * proof events stream
 */
export const proofObservable = proofSubject.asObservable();

export const getAllTokens = async (currentAccount) => {
    if(!currentAccount) {
        return [];
    }

    const length = await mappingContract.methods.tokenLength().call(); // length: string
    const tokens = await Promise.all(
        new Array(+length).fill(0).map(async (_, index) => {
            const address = await mappingContract.methods
                .allTokens(index)
                .call(); // dvm address
            const info = await mappingContract.methods
                .tokenToInfo(address)
                .call(); // { source, backing }
            const { symbol = "", decimals = 0 } = await tokenInfoGetter(
                info.source
            );
            const { name, logo } = getNameAndLogo(info.source);

            let balance = Web3.utils.toBN(0);

            if (currentAccount) {
                balance = await getTokenBalance(info.source, currentAccount);
            }

            return { ...info, address, symbol, decimals, name, logo, balance };
        })
    );

    return tokens;
};

/**
 * @param { Address } address - erc20 token address
 * @return { Promise<void> } - void
 */
export const registerToken = async (address) => {
    const isRegistered = await hasRegistered(address);

    if (!isRegistered) {
        await backingContract.methods.registerToken(address).call();

        const blockHash = await getRegisteredTokenHash(address);
        const eventsProof = await getMPTProof(
            blockHash,
            "0xe66f3de22eed97c730152f373193b5a0485b407d88f37d5fd6a2c59e5a696691"
        );

        proofSubject.next(eventsProof);
    }
};

/**
 *
 * @param {Address} address - token address
 * @returns block hash
 */
const getRegisteredTokenHash = async (address) => {
    /**
     * api response: {
     *  "extrinsic_index": string; "account_id": string; "block_num": number; "block_hash": string; "backing": string; "source": string; "target": string; "block_timestamp": number;
     *  "mmr_index": number; "mmr_root": string; "signatures": string; "block_header": JSON string; "tx": string;
     * }
     */
    const data = await axios
        .get(`${config.DAPP_API}/api/ethereumIssuing/register`, {
            params: { source: address },
        })
        .then((res) => res.data);

    return data.block_hash;
};

/**
 *
 * @param {Address} address - erc20 token address
 * @return {Promise<number>} status - 0: unregister 1: registered 2: registering
 */
export const getTokenRegisterStatus = async (address) => {
    if (!address || !Web3.utils.isAddress(address)) {
        console.warn(
            `Token address is invalid, except an ERC20 token address. Received value: ${address}`
        );
        return;
    }

    const { target, timestamp } = await backingContract.methods
        .assets(address)
        .call();
    const isTargetTruthy = !!Web3.utils.hexToNumber(target);
    const isTimestampExist = +timestamp > 0;

    if (isTimestampExist && !isTargetTruthy) {
        return 2;
    }

    if (isTimestampExist && isTargetTruthy) {
        return 1;
    }

    return 0;
};

export const hasRegistered = async (address) => {
    const status = await getTokenRegisterStatus(address);

    return !!status;
};

export const confirmRegister = async (proof) => {
    const result = await backingContract.methods.crossChainSync(proof);

    return result;
};

export async function crossSendErc20FromEthToDvm(
    tokenAddress,
    recipientAddress,
    amount
) {
    const result = await backingContract.methods.crossSendToken(
        tokenAddress,
        recipientAddress,
        amount.toString()
    );

    return result;
}

export async function crossSendErc20FromDvmToEth(
    tokenAddress,
    recipientAddress,
    amount
) {
    // dev env pangolin(id: 43) product env darwinia(id: ?);
    const isMatch = await isNetworkMatch(config.DVM_NETWORK_ID);

    if(isMatch) {
        const result = await mappingContract.methods.crossTransfer(
            tokenAddress,
            recipientAddress,
            amount.toString()
        );

        return result;
    } else {
        throw new Error('common:Ethereum network type does not match, please switch to {{network}} network in metamask.');
    }
} 
