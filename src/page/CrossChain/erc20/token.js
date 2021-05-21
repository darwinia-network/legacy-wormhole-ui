import { from, iif, NEVER, of, Subject, zip } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import {
    catchError,
    delay,
    map,
    retryWhen,
    switchMap,
    tap,
} from "rxjs/operators";
import Web3 from "web3";
import transferBridgeABI from "../abi/Backing.json";
import Erc20StringABI from "../abi/Erc20-string.json";
import mappingTokenABI from "../abi/MappingToken.json";
import configJson from "../config.json";
import {
    encodeBlockHeader,
    encodeMMRRootMessage,
    getMetamaskActiveAccount,
    getMMRProof,
    getMPTProof,
    isNetworkMatch,
} from "../utils";
import {
    getNameAndLogo,
    getSymbolAndDecimals,
    getTokenBalance,
    tokenInfoGetter,
} from "./token-util";

const config = configJson[process.env.REACT_APP_CHAIN];
const { backingContract, mappingContract, web3 } = (() => {
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

export { backingContract };

const proofSubject = new Subject();
const proofMemo = [];

/**
 * proof events stream
 */
export const proofObservable = proofSubject.asObservable();

const getTokenInfo = async (tokenAddress, currentAccount) => {
    const { symbol = "", decimals = 0 } = await tokenInfoGetter(tokenAddress);
    const { name, logo } = getNameAndLogo(tokenAddress);

    let balance = Web3.utils.toBN(0);

    if (currentAccount) {
        balance = await getTokenBalance(tokenAddress, currentAccount);
    }

    const status = await getTokenRegisterStatus(tokenAddress);

    return {
        address: tokenAddress,
        symbol,
        decimals,
        name,
        logo,
        balance,
        status,
    };
};

export const getAllTokens = async (currentAccount, networkType = "eth") => {
    if (!currentAccount) {
        return [];
    }

    return networkType === "eth"
        ? await getAllTokensEthereum(currentAccount)
        : await getAllTokensDvm(currentAccount);
};

/**
 * @function getAllTokensDvm - get all tokens at dvm side
 * @param {string} currentAccount
 * @returns tokens that status maybe registered or registering
 */
const getAllTokensDvm = async (currentAccount) => {
    const length = await mappingContract.methods.tokenLength().call(); // length: string
    const tokens = await Promise.all(
        new Array(+length).fill(0).map(async (_, index) => {
            const address = await mappingContract.methods
                .allTokens(index)
                .call(); // dvm address
            const info = await mappingContract.methods
                .tokenToInfo(address)
                .call(); // { source, backing }
            const token = await getTokenInfo(info.source, currentAccount);

            return { ...info, ...token };
        })
    );

    return tokens;
};

/**
 * @function getAllTokensEthereum - get all tokens at ethereum side
 * @param {string} currentAccount
 * @returns tokens that status maybe registered or registering
 */
const getAllTokensEthereum = async (currentAccount) => {
    const length = await backingContract.methods.assetLength().call();
    const tokens = await Promise.all(
        new Array(+length).fill(0).map(async (_, index) => {
            const address = await backingContract.methods
                .allAssets(index)
                .call();

            return await getTokenInfo(address, currentAccount);
        })
    );

    return tokens;
};

/**
 * test address 0x1F4E71cA23f2390669207a06dDDef70BDE75b679;
 * @param { Address } address - erc20 token address
 * @return { Promise<void | subscription> } - void
 */
export const registerToken = async (address) => {
    const isRegistered = await hasRegistered(address);

    if (!isRegistered) {
        const from = await getMetamaskActiveAccount();
        const { isString } = await getSymbolType(address);
        const register = isString
            ? backingContract.methods.registerToken
            : backingContract.methods.registerTokenBytes32;
        const txHash = await register(address).send({ from });

        console.log(
            "%c [ register token transaction hash ]-118",
            "font-size:13px; background:pink; color:#bf2c9f;",
            txHash
        );

        return generateRegisterProof(address).subscribe(proofSubject);
    }
};

/**
 * @function getSymbolType - Predicate the return type of the symbol method in erc20 token abi;
 * @param {string} - address
 * @returns {Promise<{symbol: string; isString: boolean }>}
 */
export const getSymbolType = async (address) => {
    try {
        const stringContract = new web3.eth.Contract(Erc20StringABI, address);
        const symbol = await stringContract.methods.symbol().call();

        return { symbol, isString: true };
    } catch (error) {
        const { symbol } = await getSymbolAndDecimals(address);

        return { symbol, isString: false };
    }
};

/**
 * @param {string} address
 * @returns {subscription}
 */
const generateRegisterProof = (address) => {
    const proofAddress =
        "0xe66f3de22eed97c730152f373193b5a0485b407d88f37d5fd6a2c59e5a696691";

    return fromFetch(
        `${config.DAPP_API}/api/ethereumIssuing/register?source=${address}`,
        { selector: (response) => response.json() }
    ).pipe(
        map(({ data }) => {
            if (!data) {
                const msg = `Unreceived register block info of ${address}, refetch it after 5 seconds`;

                // console.info(msg);
                throw new Error(msg);
            }

            return data;
        }),
        retryWhen((error) => error.pipe(delay(5000))),
        switchMap((data) => {
            const { block_hash, block_num, mmr_index } = data;
            const mptProof = from(getMPTProof(block_hash, proofAddress)).pipe(
                map((proof) => proof.toHex()),
                catchError((err) => {
                    console.warn(
                        "%c [ get MPT proof error ]-216",
                        "font-size:13px; background:pink; color:#bf2c9f;",
                        err.message,
                        block_hash
                    );

                    return NEVER;
                })
            );
            const mmrProof = from(
                getMMRProof(block_num, mmr_index, block_hash)
            ).pipe(
                catchError((err) => {
                    console.warn(
                        "%c [ get MMR proof error ]-228",
                        "font-size:13px; background:pink; color:#bf2c9f;",
                        err.message,
                        block_hash,
                        block_num,
                        mmr_index
                    );

                    return NEVER;
                })
            );

            return zip(mptProof, mmrProof, (eventsProofStr, proof) => ({
                ...data,
                ...proof,
                eventsProofStr,
            }));
        }),
        tap((proof) => proofMemo.push(proof))
    );
};

/**
 * @param {Address} address - token address
 * @returns {subscription}
 */
export const popupRegisterProof = (address) => {
    const proof = proofMemo.find((item) => item.source === address);
    const fromQuery = generateRegisterProof(address);
    const fromMemo = of(proof).pipe(delay(2000));

    return iif(() => !!proof, fromMemo, fromQuery).subscribe(proofSubject);
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
    let isTargetTruthy = false;
    const isTimestampExist = +timestamp > 0;

    try {
        // if target exists, the number should be overflow.
        isTargetTruthy = !!Web3.utils.hexToNumber(target);
    } catch (_) {
        isTargetTruthy = true;
    }

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
    const {
        signatures,
        mmr_root,
        mmr_index,
        block_header,
        peaks,
        siblings,
        eventsProofStr,
    } = proof;
    const from = await getMetamaskActiveAccount();
    const mmrRootMessage = encodeMMRRootMessage(
        config.D2E_NETWORK_PREFIX,
        "0x479fbdf9",
        mmr_index,
        mmr_root
    );
    const blockHeader = encodeBlockHeader(block_header);
    // !FIXME: unhandled reject error [object object] on Firefox;
    const tx = await backingContract.methods
        .crossChainSync(
            mmrRootMessage.toHex(),
            signatures.split(","),
            mmr_root,
            mmr_index,
            blockHeader.toHex(),
            peaks,
            siblings,
            eventsProofStr
        )
        .send({ from })
        .on("transactionHash", (hash) => {
            console.log(
                "%c [ hash ]-331",
                "font-size:13px; background:pink; color:#bf2c9f;",
                hash
            );
        })
        .on("error", (error) => {
            console.log(
                "%c [ error ]-334",
                "font-size:13px; background:pink; color:#bf2c9f;",
                error
            );
        });

    return tx;
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

    if (isMatch) {
        const result = await mappingContract.methods.crossTransfer(
            tokenAddress,
            recipientAddress,
            amount.toString()
        );

        return result;
    } else {
        throw new Error(
            "common:Ethereum network type does not match, please switch to {{network}} network in metamask."
        );
    }
}
