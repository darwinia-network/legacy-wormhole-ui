import { ToastContainer, toast } from "react-toastify";
import axios from 'axios';
import ConfigJson from './config';
import Web3 from 'web3';
import { checkAddress, decodeAddress } from '@polkadot/util-crypto';
import BN from 'bn.js';
import genesisData from './genesis';
import TokenABI from './tokenABI';

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export const config = ConfigJson[process.env.REACT_APP_CHAIN];

function connectEth(accountsChangedCallback, t) {
    if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
        let web3js = new Web3(window.ethereum || window.web3.currentProvider);

        if (window.ethereum) {
            window.ethereum.enable()
                .then((account) => {
                    if (window.ethereum.on) {
                        window.ethereum.on('accountsChanged', (accounts) => {
                            if (accounts.length > 0) {
                                accountsChangedCallback && accountsChangedCallback('eth', accounts[0].toLowerCase());
                            }
                        })
                    }

                    if (account.length > 0) {
                        accountsChangedCallback && accountsChangedCallback('eth', account[0].toLowerCase());
                    }
                })
                .catch(console.error)
        } else if (window.web3) {
            web3js.eth.getAccounts().then(account => {
                if (Array.isArray(account) && account.length) {
                    accountsChangedCallback && accountsChangedCallback('eth', account[0].toLowerCase());
                }
            }).catch(console.error)
        }
    } else {
        formToast(t('Please install MetaMask first'));
    }
}

function connectTron(accountsChangedCallback, t) {
    if (typeof window.tronWeb !== 'undefined') {
        if (!(window.tronWeb && window.tronWeb.ready)) {
            formToast(t('Please unlock TronLink first'));
            return
        }
        const wallet = window.tronWeb.defaultAddress;
        const preAddress = wallet.base58;
        window.tronWeb.on("addressChanged", wallet => {
            if (window.tronWeb) {
                console.log('addressChanged', preAddress, wallet.base58)
                if(preAddress !== wallet.base58) {
                    accountsChangedCallback && accountsChangedCallback('tron', wallet.base58)
                }
            }
        })
        accountsChangedCallback && accountsChangedCallback('tron', wallet.base58)
    } else {
        formToast(t('Please install TronLink first'));
    }
}

function getRawData(text) {
    return config.SIGN_PREFIX + text
}

function combineFormatSignature(address, msg, sig) {
    return JSON.stringify({
        "address": address,
        "msg": msg,
        "sig": sig,
        "version": "3",
        "signer": "DarwiniaNetworkClaims"
    })
}

function signEth(account, text, signCallBack) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const rawData = getRawData(text);
    web3js.eth.personal.sign(rawData, account)
        .then((signature) => {
            signCallBack && signCallBack(combineFormatSignature(account, rawData, signature));
        });
}

function signTron(account, text, signCallBack) {
    const rawData = getRawData(text);
    if (typeof window.tronWeb !== 'undefined') {
        window.tronWeb.trx.sign(Web3.utils.stringToHex(rawData)).then((signature) => {
            signCallBack && signCallBack(combineFormatSignature(window.tronWeb.address.toHex(account), rawData, signature));
        })
    }
}

function buildInGenesisEth(account, params, callback) {
    console.log(111, params)
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(TokenABI, config[`${params.tokenType.toUpperCase()}_ETH_ADDRESS`]);

    contract.methods.transferFrom(account, config['ETHEREUM_DARWINIA_CROSSCHAIN'], params.value, params.toHex).send({ from: account }).on('transactionHash', (hash) => {
        callback && callback(hash)
    }).on('confirmation', () => {

    }).catch((e) => {
        console.log(e)
    })
}

async function buildInGenesisTron(account, params, callback) {
    const tronwebjs = window.tronWeb
    let contract = await tronwebjs.contract().at(config[`${params.tokenType.toUpperCase()}_TRON_ADDRESS`])
    const res = contract.methods.transferAndFallback(config['TRON_DARWINIA_CROSSCHAIN'], params.value.toString(), params.toHex).send({  
        feeLimit: tronwebjs.toSun(100),
        callValue: 0,
        shouldPollResponse: false,
     })
     res.then((hash) => {
        callback && callback(hash);
     }).catch((e) => {
        console.log(e)
     })
}

export function connect(type, callback, t) {
    if (type === 'tron') {
        connectTron(callback, t)
    }

    if (type === 'eth') {
        connectEth(callback, t)
    }
}

export function sign(type, account, text, callback, t) {
    const checkResult = checkAddress(text, config.S58_PREFIX);

    if (!checkResult[0]) {
        formToast(t(`The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(text, false, config.S58_PREFIX).buffer)

    if (type === 'tron') {
        signTron(account, decodedAddress, callback)
    }

    if (type === 'eth') {
        signEth(account, decodedAddress, callback)
    }
}

export function buildInGenesis(type, account, params, callback, t) {
    const checkResult = checkAddress(params.to, config.S58_PREFIX);

    if (!checkResult[0]) {
        formToast(t(`The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    if (params.value.eq(new BN(0))) {
        formToast(t(`The transfer amount cannot be 0`))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(params.to, false, config.S58_PREFIX).buffer)
    params.toHex = '0x' + decodedAddress

    if (type === 'tron') {
        buildInGenesisTron(account, params, callback)
    }

    if (type === 'eth') {
        buildInGenesisEth(account, params, callback)
    }
}

export const formToast = (text) => {
    toast.info(text, {
        position: toast.POSITION.TOP_RIGHT,
        className: 'darwinia-toast'
    });
}


export function getAirdropData(type, account) {
    if (!account) return Web3.utils.toBN(0);

    if (type === 'tron') {
        return Web3.utils.toBN(genesisData.tron[window.tronWeb.address.toHex(account)] || 0);
    }

    if (type === 'eth') {
        const dotAirdropNumber = Web3.utils.toBN(genesisData.dot[account] || 0);
        const ethAirdropNumber = Web3.utils.toBN(genesisData.eth[account] || 0);
        return dotAirdropNumber.add(ethAirdropNumber);
    }
}

export function formatBalance(bn = Web3.utils.toBN(0), unit = 'gwei') {
    if (bn.eqn(0)) return '0';
    return Web3.utils.fromWei(bn, unit).toString();
}

export const wxRequest = async (params = {}, url) => {
    let data = params.query || {}
    return new Promise((resolve, reject) => {
        axios({
            url: url,
            method: params.method.toUpperCase() === 'FORM' ? 'POST' : params.method || 'GET',
            data: data,
            params: data,
            headers: {
                'Content-Type': params.method === 'FORM' ? 'application/x-www-form-urlencoded' : 'application/json;charset=UTF-8;',
            }
        }).then(function (data) {
            if (data && data.data) {
                console.log(`fetchData url: ${url}`, data.data);
            }
            resolve(data.data)
        })
            .catch(function (error) {
                console.log(error);
            })
    })
}

export const getClaimsInfo = (params) => wxRequest(params, `${config.SUBSCAN_API}/api/other/claims`)

export const getBuildInGenesisInfo = (params) => wxRequest(params, `${config.DAPP_API}/api/ringBurn`)

export function getTokenBalanceEth(account = '') {
    try {

        let web3js = new Web3(window.ethereum || window.web3.currentProvider);
        const ringContract = new web3js.eth.Contract(TokenABI, config.RING_ETH_ADDRESS);
        const ktonContract = new web3js.eth.Contract(TokenABI, config.KTON_ETH_ADDRESS);

        const ringBalance = new Promise((resolve, reject) => {
            try {
                ringContract.methods.balanceOf(account).call().then((result) => {
                    console.log('ring:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        const ktonBalance = new Promise((resolve, reject) => {
            try {
                ktonContract.methods.balanceOf(account).call().then((result) => {
                    console.log('kton:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        return Promise.all([ringBalance, ktonBalance]).then((values) => {
            return values
        })
    } catch (error) {
        console.log(error);
    }
}

export async function getTokenBalanceTron(account = '') {
    try {
        const tronwebjs = window.tronWeb

        const ringContract = await tronwebjs.contract().at(config.RING_TRON_ADDRESS);
        const ktonContract = await tronwebjs.contract().at(config.KTON_TRON_ADDRESS);

        const ringBalance = new Promise((resolve, reject) => {
            try {
                ringContract.methods.balanceOf(account).call().then((result) => {
                    console.log('ring:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        const ktonBalance = new Promise((resolve, reject) => {
            try {
                ktonContract.methods.balanceOf(account).call().then((result) => {
                    console.log('kton:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        return Promise.all([ringBalance, ktonBalance]).then((values) => {
            return values
        })
    } catch (error) {
        console.log(error);
    }
}

export function getTokenBalance(networkType, account) {
    if(networkType === 'eth') {
        return getTokenBalanceEth(account)
    } else {
        return getTokenBalanceTron(account)
    }
}
