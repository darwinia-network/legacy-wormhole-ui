
import Web3 from 'web3';
import 

const registerToken = async (tokenAddress) => {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3.eth.Contract(
        TransferBridgeABI,
        config.TRANSFER_BRIDGE_ETH_ADDRESS
    );

    const res = await contract.methods.registerToken(tokenAddress);
    console.log('%c [ res ]-18', 'font-size:13px; background:pink; color:#bf2c9f;', res);

    if(window.darwiniaApi) {
        await window.darwiniaApi.isReady;
    }
};