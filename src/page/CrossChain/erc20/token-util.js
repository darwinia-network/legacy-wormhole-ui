import contractMap from '@metamask/contract-metadata';
import erc20ABI from 'human-standard-token-abi';
import Web3 from 'web3';
import tokenABI from '../../CrossChain/tokenABI.json';
import { config, getUnitFromValue } from '../utils';

const DEFAULT_SYMBOL = '';
const DEFAULT_DECIMALS = '0';

/**
 * tokenCache: { address: string; symbol?: string; decimals?: string; name?: string; logo?: string;}[];
 */
const tokenCache = [];

function updateTokenCache(value) {
  const { address, ...others } = value;
  const index = tokenCache.findIndex((token) => token.address === address);

  if (index > 0) {
    tokenCache[index] = { ...tokenCache[index], ...others };
  } else {
    tokenCache.push(value);
  }

  return tokenCache;
}

const contractList = Object.entries(contractMap)
  .map(([address, tokenData]) => ({ ...tokenData, address }))
  .filter((tokenData) => Boolean(tokenData.erc20));

export function getContractAtAddress(tokenAddress) {
  const web3 = new Web3(config.ETHERSCAN_DOMAIN.rpc);

  return new web3.eth.Contract(erc20ABI, tokenAddress);
}

/**
 *
 * @param tokenAddress - token contract address
 * @param account - current active metamask account
 * @returns balance of the account
 */
export async function getTokenBalance(address, account, isEth = true) {
  const web3 = new Web3(window.ethereum || window.web3.currentProvider);
  const abi = isEth ? erc20ABI : tokenABI;
  const contract = new web3.eth.Contract(abi, address);

  try {
    const balance = await contract.methods.balanceOf(account).call();

    return Web3.utils.toBN(balance);
  } catch (err) {
    console.info('%c [ get token balance error ]-52', 'font-size:13px; background:pink; color:#bf2c9f;', err.message);
  }

  return Web3.utils.toBN(0);
}

async function getSymbolFromContract(tokenAddress) {
  const token = getContractAtAddress(tokenAddress);

  try {
    const result = await token.methods.symbol().call();
    return result;
  } catch (error) {
    console.warn(`symbol() call for token at address ${tokenAddress} resulted in error:`, error);
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
    console.warn(`decimals() call for token at address ${tokenAddress} resulted in error:`, error);
    return undefined;
  }
}

async function getDecimals(tokenAddress) {
  let decimals = await getDecimalsFromContract(tokenAddress);

  if (!decimals || decimals === '0') {
    const contractMetadataInfo = getContractMetadata(tokenAddress);

    if (contractMetadataInfo) {
      decimals = contractMetadataInfo.decimals;
    }
  }

  return decimals;
}

// eslint-disable-next-line complexity
export async function getSymbolAndDecimals(tokenAddress, cacheFirst = true) {
  const isTarget = ({ address }) => address === tokenAddress;
  const fromCache = tokenCache.find(isTarget);
  const fromContractList = contractList.find(isTarget);

  if ((fromCache || fromContractList) && cacheFirst) {
    return {
      symbol: fromCache?.symbol || fromContractList?.symbol,
      decimals: fromCache?.decimals || fromContractList?.decimals,
    };
  }

  let symbol;
  let decimals;

  try {
    symbol = await getSymbol(tokenAddress);
    decimals = await getDecimals(tokenAddress);
  } catch (error) {
    console.warn(`symbol() and decimal() calls for token at address ${tokenAddress} resulted in error:`, error);
  }

  const result = {
    symbol: symbol || DEFAULT_SYMBOL,
    decimals: decimals || DEFAULT_DECIMALS,
  };

  updateTokenCache({ address: tokenAddress, ...result });

  return result;
}

export function getNameAndLogo(tokenAddress) {
  const { name, logo } = contractList.find((token) => token.address === tokenAddress) || {}; // logo: image name;

  updateTokenCache({ address: tokenAddress, name, logo });

  return { name, logo };
}

export const tokenInfoGetter = ((cacheFirst = true) => {
  const tokens = {};

  return async (address) => {
    if (tokens[address]) {
      return tokens[address];
    }

    tokens[address] = await getSymbolAndDecimals(address, cacheFirst);

    return tokens[address];
  };
})();

export function getTokenName(name, symbol) {
  return typeof name === 'undefined' ? symbol : `${name} (${symbol})`;
}

export async function getUnitFromAddress(address) {
  const { decimals } = await getSymbolAndDecimals(address);

  return getUnitFromValue(+decimals);
}
