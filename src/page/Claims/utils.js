import { toast } from "react-toastify";
import axios from 'axios';
import ConfigJson from './config';
import Web3 from 'web3';
import { checkAddress, decodeAddress } from '@polkadot/util-crypto';

import genesisData from './genesis';

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export const config = ConfigJson[process.env.REACT_APP_CHAIN];

function connectEth(accountsChangedCallback, t) {
    if (typeof window.ethereum !== 'undefined') {
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
    } else {
        formToast(t('common:Please install MetaMask first'));
    }
}

function connectTron(accountsChangedCallback, t) {
    if (typeof window.tronWeb !== 'undefined') {
        if (!(window.tronWeb && window.tronWeb.ready)) {
            formToast(t('common:Please unlock TronLink first'));
            return
        }
        const wallet = window.tronWeb.defaultAddress;
        const preAddress = wallet.base58;
        window.tronWeb.on("addressChanged", wallet => {
            if (window.tronWeb) {
                if(preAddress !== wallet.base58) {
                    accountsChangedCallback && accountsChangedCallback('tron', wallet.base58)
                }
            }
        })
        accountsChangedCallback && accountsChangedCallback('tron', wallet.base58)
    } else {
        formToast(t('common:Please install TronLink first'));
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
    let web3js = new Web3(window.ethereum);
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
        formToast(t(`crosschain:The entered {{account}} account is incorrect`, {
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

export function formatBalance(bn = Web3.utils.toBN(0)) {
    if (bn.eqn(0)) return '0';
    return Web3.utils.fromWei(bn, 'gwei').toString();
}

export const wxRequest = async (params = {}, url) => {
    let data = params.query || {}
    return new Promise((resolve, reject) => {
        axios({
            url: url,
            method: params.method.toUpperCase === 'FORM' ? 'POST' : params.method || 'GET',
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

