import contractMap from "@metamask/contract-metadata";
import abi from "human-standard-token-abi";
import Web3 from "web3";

const DEFAULT_SYMBOL = "";
const DEFAULT_DECIMALS = "0";

const contractList = Object.entries(contractMap)
    .map(([address, tokenData]) => ({ ...tokenData, address }))
    .filter((tokenData) => Boolean(tokenData.erc20));

export function getContractAtAddress(tokenAddress) {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);

    return new web3.eth.Contract(abi, tokenAddress);
}

/**
 *
 * @param {string} tokenAddress - token contract address
 * @param {string} account - current active metamask account
 * @returns {BN} balance of the account
 */
export async function getTokenBalance(address, account) {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3.eth.Contract(abi, address);

    try {
        const balance = await contract.methods.balanceOf(account).call();

        return Web3.utils.toBN(balance);
    } catch (err) {
        console.log(
            "%c [ error ]-31",
            "font-size:13px; background:pink; color:#bf2c9f;",
            err
        );
    }

    return 0;
}

async function getSymbolFromContract(tokenAddress) {
    const token = getContractAtAddress(tokenAddress);

    try {
        const result = await token.methods.symbol().call();
        return result;
    } catch (error) {
        console.warn(
            `symbol() call for token at address ${tokenAddress} resulted in error:`,
            error
        );
        return undefined;
    }
}

const casedContractMap = Object.keys(contractMap).reduce((acc, base) => {
    return {
        ...acc,
        [base.toLowerCase()]: contractMap[base],
    };
}, {});

function getContractMetadata(tokenAddress) {
    return tokenAddress && casedContractMap[tokenAddress.toLowerCase()];
}

async function getSymbol(tokenAddress) {
    let symbol = await getSymbolFromContract(tokenAddress);

    if (!symbol) {
        const contractMetadataInfo = getContractMetadata(tokenAddress);

        if (contractMetadataInfo) {
            symbol = contractMetadataInfo.symbol;
        }
    }

    return symbol;
}

async function getDecimalsFromContract(tokenAddress) {
    const token = getContractAtAddress(tokenAddress);

    try {
        const result = await token.methods.decimals().call();
        const decimalsBN = result;

        return decimalsBN?.toString();
    } catch (error) {
        console.warn(
            `decimals() call for token at address ${tokenAddress} resulted in error:`,
            error
        );
        return undefined;
    }
}

async function getDecimals(tokenAddress) {
    let decimals = await getDecimalsFromContract(tokenAddress);

    if (!decimals || decimals === "0") {
        const contractMetadataInfo = getContractMetadata(tokenAddress);

        if (contractMetadataInfo) {
            decimals = contractMetadataInfo.decimals;
        }
    }

    return decimals;
}

async function getSymbolAndDecimals(tokenAddress, existingTokens = []) {
    const existingToken = existingTokens.find(
        ({ address }) => tokenAddress === address
    );

    if (existingToken) {
        return {
            symbol: existingToken.symbol,
            decimals: existingToken.decimals,
        };
    }

    let symbol, decimals;

    try {
        symbol = await getSymbol(tokenAddress);
        decimals = await getDecimals(tokenAddress);
    } catch (error) {
        console.warn(
            `symbol() and decimal() calls for token at address ${tokenAddress} resulted in error:`,
            error
        );
    }

    return {
        symbol: symbol || DEFAULT_SYMBOL,
        decimals: decimals || DEFAULT_DECIMALS,
    };
}

export function getNameAndLogo(address) {
    const { name, logo } =
        contractList.find((token) => token.address === address) || {}; // logo: image name;

    return { name, logo };
}

export const tokenInfoGetter = (() => {
    const tokens = {};

    return async (address) => {
        if (tokens[address]) {
            return tokens[address];
        }

        tokens[address] = await getSymbolAndDecimals(address);

        return tokens[address];
    };
})();

export function getTokenName(name, symbol) {
    return typeof name === "undefined" ? symbol : `${name} (${symbol})`;
}
