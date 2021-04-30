import axios from "axios";
import Web3 from "web3";
import transferBridgeABI from "../abi/Backing.json";
import mappingTokenABI from "../abi/MappingToken.json";
import configJson from "../config.json";
import { tokenInfoGetter } from "./token-util";
import { DARWINIA_PROVIDER } from "../provider";

const config = configJson[process.env.REACT_APP_CHAIN];
const { backingContract, mappingContract } = (() => {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);
    const backingContract = new web3.eth.Contract(
        transferBridgeABI,
        config.TRANSFER_BRIDGE_ETH_ADDRESS
    );
    const web3Darwinia = new Web3(DARWINIA_PROVIDER);
    const mappingContract = new web3Darwinia.eth.Contract(
        mappingTokenABI,
        config.MAPPING_FACTORY_ADDRESS
    );

    return {
        backingContract,
        mappingContract,
    };
})();

const getTokensInfo = (async () => {
    const length = await mappingContract.methods.tokenLength().call(); // length: string
    const tokens = await Promise.all(
        new Array(+length).fill(0).map(async (_, index) => {
            const address = await mappingContract.methods
                .allTokens(index)
                .call();
            const info = await mappingContract.methods
                .tokenToInfo(address)
                .call();
            const { symbol = "", decimals = 0 } = await tokenInfoGetter(
                address
            );

            return { ...info, address, symbol, decimals };
        })
    );

    console.log(
        "%c [ tokens ]-170",
        "font-size:13px; background:pink; color:#bf2c9f;",
        tokens
    );
    return {
        tokens,
    };
})();

const { assets } = (async () => {
    const assets = await backingContract.methods
        .assets("0x8d86E21649aebbeb4DDb2614E3d72673351b17a2")
        .call();

    return { assets };
})();

/**
 * 已注册的tokens
 */

/**
 * @param { Address } address - erc20 token address
 * @return { void } - undefined
 */
export const registerToken = async (address) => {
    const isRegistered = await hasRegistered(address);

    if (!isRegistered) {
        await backingContract.methods.registerToken(address).call();
    }
};

/**
 *
 * @param {Address} address - token address
 * @returns block hash
 */
const getRegisteredTokenHash = async (address) => {
    const hash = await axios
        .get("xxx", { params: { address } })
        .then((res) => res.data);

    return hash;
};

/**
 *
 * @param {Address} address - erc20 token address
 * @return {Promise<number>} status - 0: unregister 1: registered 2: registering
 */
const getTokenRegisterStatus = async (address) => {
    const { target, timestamp } = await backingContract.methods
        .assets(address)
        .call();

    if (!!timestamp && !target) {
        return 2;
    }

    if (!!timestamp && !!target) {
        return 1;
    }

    return 0;
};

export const hasRegistered = async (address) => {
    const status = await getTokenRegisterStatus(address);

    return !!status;
};
