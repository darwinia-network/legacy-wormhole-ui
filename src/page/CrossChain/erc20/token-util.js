import contractMap from "@metamask/contract-metadata";
import abi from "human-standard-token-abi";
import Web3 from "web3";

const DEFAULT_SYMBOL = "";
const DEFAULT_DECIMALS = "0";

export function getContractAtAddress(tokenAddress) {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);

    return new web3.eth.Contract(abi, tokenAddress);
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
