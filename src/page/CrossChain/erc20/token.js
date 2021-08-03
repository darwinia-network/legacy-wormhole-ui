import { from, iif, NEVER, of, Subject, zip } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import {
    catchError,
    delay,
    distinctUntilKeyChanged,
    map,
    retryWhen,
    switchMap,
    tap,
} from "rxjs/operators";
import Web3 from "web3";
import transferBridgeABI from "../abi/Backing.json";
import Erc20StringABI from "../abi/Erc20-string.json";
import Erc20ABI from "../abi/Erc20.json";
import mappingTokenABI from "../abi/MappingToken.json";
import configJson from "../config.json";
import TokenABI from "../tokenABI.json";
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
    getUnitFromAddress,
    tokenInfoGetter,
} from "./token-util";

const config = configJson[process.env.REACT_APP_CHAIN];
const { backingContract, mappingContract, web3 } = (() => {
    const web3 = new Web3(window.ethereum);
    const backingContract = new web3.eth.Contract(
        transferBridgeABI,
        config.E2D_BACKING_ADDRESS
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
const proofMemo = [];

/**
 * proof events stream
 */
export const proofObservable = proofSubject
    .asObservable()
    .pipe(distinctUntilKeyChanged("source"));

const getTokenInfo = async (tokenAddress) => {
    const { symbol = "", decimals = 0 } = await tokenInfoGetter(tokenAddress);
    const { name, logo } = getNameAndLogo(tokenAddress);

    return {
        symbol,
        decimals,
        name,
        logo,
    };
};

/**
 *
 * @param {string} currentAccount - metamask active account
 * @param {string} networkType - eth or darwinia
 * @returns {address: string; source: string; backing: string; symbol: string; decimals: string; name: string; logo: string; status; balance: BN}
 * for eth: both address and source fields in result are all represent the token's ethereum address, actually equal
 * for dvm: the address field represent the token's dvm address, the source field represent the token's ethereum address.
 */
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
            const token = await getTokenInfo(info.source);
            const status = await getTokenRegisterStatus(info.source, false);
            let balance = Web3.utils.toBN(0);

            if (currentAccount) {
                balance = await getTokenBalance(address, currentAccount, false);
            }

            return { ...info, ...token, balance, status, address };
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
            const info = await getTokenInfo(address);
            const status = await getTokenRegisterStatus(address);
            let balance = Web3.utils.toBN(0);

            if (currentAccount) {
                balance = await getTokenBalance(address, currentAccount);
            }

            return {
                ...info,
                balance,
                status,
                address,
                source: address,
                backing: backingContract.options.address,
            };
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

        return generateRegisterProof(address).subscribe((proof) =>
            proofSubject.next(proof)
        );
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

const loopQuery = (url) => {
    return fromFetch(url, { selector: (response) => response.json() }).pipe(
        map(({ data }) => {
            if (!data || !data.mmr_root || !data.signatures) {
                const msg = `The ${url} api has no result, refetch it after 5 seconds`;

                // console.info(msg);
                throw new Error(msg);
            }

            return data;
        }),
        retryWhen((error) => error.pipe(delay(5000)))
    );
};

/**
 * @description - 1. fetch block hash from server, if block hash has not generated yet, send request every five seconds.
 * 2. calculate mpt proof and mmr proof then combine them together
 * 3. cache the result and emit it to proof subject.
 * @param {string} address
 * @returns {subscription}
 */
const generateRegisterProof = (address) => {
    return loopQuery(
        `${config.DAPP_API}/api/ethereumIssuing/register?source=${address}`
    ).pipe(
        switchMap((data) => {
            const { block_hash, block_num, mmr_index } = data;
            const mptProof = from(getMPTProof(block_hash, config.PROOF_ADDRESS)).pipe(
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
 * @description - Check register proof in cache, if exists emit it directly, otherwise get it through api request.
 * @param {Address} address - token address
 * @returns {subscription}
 */
export const popupRegisterProof = (address) => {
    const proof = proofMemo.find((item) => item.source === address);
    const fromQuery = generateRegisterProof(address);
    const fromMemo = of(proof).pipe(delay(2000));

    return iif(() => !!proof, fromMemo, fromQuery).subscribe((proof) =>
        proofSubject.next(proof)
    );
};

/**
 *
 * @param {Address} address - erc20 token address
 * @return {Promise<number>} status - 0: unregister 1: registered 2: registering
 */
export const getTokenRegisterStatus = async (address, isEth = true) => {
    if (!address || !Web3.utils.isAddress(address)) {
        console.warn(
            `Token address is invalid, except an ERC20 token address. Received value: ${address}`
        );
        return;
    }

    let contract = backingContract;

    if (!isEth) {
        const web3 = new Web3(config.ETHERSCAN_DOMAIN.rpc);

        contract = new web3.eth.Contract(
            transferBridgeABI,
            config.E2D_BACKING_ADDRESS
        );
    }

    const { target, timestamp } = await contract.methods.assets(address).call();
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

export const claimErc20Token = confirmRegister;

export async function canCrossSendToDvm(token, currentAccount) {
    return canCrossSend(token, currentAccount, "eth");
}

export async function canCrossSendToEth(token, currentAccount) {
    return canCrossSend(token, currentAccount, "darwinia");
}

async function canCrossSend(token, currentAccount, networkType) {
    const isAllowanceEnough = await hasApproved(token, currentAccount, networkType); 

    if (isAllowanceEnough) {
        return true;
    } else {
        const { contract, contractAddress } = getContractWithAddressByNetwork(token, networkType);
        const tx = await contract.methods
            .approve(
                contractAddress,
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            )
            .send({ from: currentAccount });

        return tx.transactionHash;
    }
}

function getContractWithAddressByNetwork(token, networkType) {
    const { address, source } = token;
    const abi = networkType === "eth" ? Erc20ABI : TokenABI;
    const contractAddress =
        networkType === "eth"
            ? config.E2D_BACKING_ADDRESS
            : config.MAPPING_FACTORY_ADDRESS;
    const contract = new web3.eth.Contract(abi, networkType === 'eth' ? source : address);

    return { contract, contractAddress };
}

export async function hasApproved(token, currentAccount, networkType) {
    const { source, balance: amount } = token;
    const { contract, contractAddress } = getContractWithAddressByNetwork(token, networkType);
    const unit = await getUnitFromAddress(source);
    const allowance = await contract.methods
        .allowance(currentAccount, contractAddress)
        .call();

    return Web3.utils
        .toBN(allowance)
        .gte(Web3.utils.toBN(Web3.utils.fromWei(amount.toString(), unit)));
}

/**
 *
 * @param {string} tokenAddress - erc20 token address
 * @param {string} recipientAddress - recipient address, ss58 format
 * @param {BN} amount - transfer token amount
 * @param {string} currentAccount - metamask current active account
 */
export async function crossSendErc20FromEthToDvm(
    tokenAddress,
    recipientAddress,
    amount,
    currentAccount
) {
    const tx = await backingContract.methods
        .crossSendToken(tokenAddress, recipientAddress, amount.toString())
        .send({ from: currentAccount });

    return tx.transactionHash;
}

export async function crossSendErc20FromDvmToEth(
    tokenAddress,
    recipientAddress,
    amount,
    currentAccount
) {
    // dev env pangolin(id: 43) product env darwinia(id: ?);
    const isMatch = await isNetworkMatch(config.DVM_NETWORK_ID);

    if (isMatch) {
        const web3 = new Web3(window.ethereum || window.currentProvider);
        const contract = new web3.eth.Contract(
            mappingTokenABI,
            config.MAPPING_FACTORY_ADDRESS
        );
        const tx = await contract.methods
            .crossTransfer(tokenAddress, recipientAddress, amount.toString())
            .send({ from: currentAccount });

        return tx.transactionHash;
    } else {
        throw new Error(
            "common:Ethereum network type does not match, please switch to {{network}} network in metamask."
        );
    }
}

/**
 *
 * @param {string} source - uin256 string
 * @returns {BN}
 */
export function decodeUint256(source) {
    const bytes = Web3.utils.hexToBytes(source);
    const hex = Web3.utils.bytesToHex(bytes.reverse());
    const web3 = new Web3(config.ETHERSCAN_DOMAIN.rpc);
    const result = web3.eth.abi.decodeParameter("uint256", hex);

    return Web3.utils.toBN(result);
}
