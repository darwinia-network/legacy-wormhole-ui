[English](./bridge_en.md)
### 基本功能
虫洞是一个web-app，提供通过darwinia跨链桥用户转账的操作工具，用户根据自己的需要选择跨链桥，并使用自己的钱包向网络发送转账交易，工具实时显示账户的转账进度以及历史记录。所有操作都是去中心化的，数据在链上可查。
目前虫洞支持 Ethereum <=> Darwinia 网络之间的双向转账，在网页端使用Chrome浏览器，需要安装Polkadot以及metamask钱包
进入虫洞主页：https://wormhole.darwinia.network.com/

### Darwinia Mainnet => Ethereum
#### 操作过程
* 打开虫洞主页 https://wormhole.darwinia.network.com
* 点击Darwinia，然后点击Ethereum下方的`跨链转账`
![虫洞主页](./assets/wormhole.png)
* 进入转账页面，选择下拉框网络为 `Darwinia MainNet -> Ethereum`，点击`跨链转账`按钮
![选择网络](./assets/select_d2e.png)
* 下拉框选择正确的Darwinia主网发送账号，填写正确的Ethereum接收账号(0x开头的地址)，并勾选需要转账的通证，填写转账金额
![发送交易](./assets/send_d2e.png)
* 点击提交按钮，此时会弹出polkadot钱包，输入钱包密码并点击`签名交易`
![钱包确认](./assets/polkadot.png)
至此，已经从Darwinia向Ethereum的跨链请求完成过半，等待Darwinia网络确认

* 点击`跨链记录`查看转账进度，等待网络确认成功后会显示领取按钮
![转账进度](./assets/confirm_d2e.png)
* 点击领取按钮，在弹出的Metamask钱包确认发送交易领取Ethereum上的Token
* 等待交易确认后，至此完成了所有的跨链转账过程，此时可以在跨链记录中查看各个阶段的状态以及交易链接
![转账完成](./assets/finish.png)
