import React, { Component } from "react";
import { Container, Button, Form } from 'react-bootstrap'

import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { connect, sign, formToast, getAirdropData, config, formatBalance } from './utils'
import archorsComponent from '../../components/anchorsComponent'
import { withTranslation } from "react-i18next";
import styles from "./style.module.scss";
import darwiniaLogo from './img/darwinia-logo.png';
import step1open from './img/step-1-open.png';
import step2open from './img/step-2-open.png';
import step2close from './img/step-2-close.png';
import step3open from './img/step-3-open.png';
import step3close from './img/step-3-close.png';
import promoteLogo from './img/promote-logo.png';
import helpLogo from './img/help-icon.png';
import labelTitleLogo from './img/label-title-logo.png';

class Claims extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            status: 1,
            networkType: 'eth',
            account: {
                eth: '',
                tron: ''
            },
            signature: '',
            darwiniaAddress: '',
            airdropNumber: Web3.utils.toBN(0)
        }
    }

    componentDidMount() {
        archorsComponent()
    }

    setValue = (key, event) => {
        this.setState({
            [key]: event.target.value
        })
        event.persist()
    }

    toClaims = (status = 2) => {
        const { networkType, account } = this.state;
        connect(networkType, (_networkType, _account) => {
            this.setState({
                account: {
                    ...account,
                    [_networkType]: _account
                }
            }, () => {
                if (this.state.account[_networkType]) {
                    this.setState({
                        status: status
                    })
                    this.airdropData()
                }
            })
        })
    }

    sign = () => {
        const { networkType, account, darwiniaAddress } = this.state;
        sign(networkType, account[networkType], darwiniaAddress, (signature) => {
            this.setState({
                signature: signature,
                status: 3
            })
        })
    }

    onCopied = () => {
        formToast('复制成功')
    }

    toResult = () => {
        this.toClaims(4)
    }

    goBack = (status = 1) => {
        this.setState({
            status: status
        })
    }

    airdropData = () => {
        const { networkType, account } = this.state;
        const airdropNumber = getAirdropData(networkType, account[networkType]);
        this.setState({
            airdropNumber: airdropNumber
        })
    }

    renderHeader = () => {
        const { status } = this.state;
        return (
            <>
                {status === 1 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>选择网络</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2close} />
                        <p>输入接收地址</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>成功</p>
                    </div>
                </div> : null}
                {status === 2 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>选择网络</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>输入接收地址</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>成功</p>
                    </div>
                </div> : null}
                {status === 3 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>选择网络</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>输入接收地址</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>成功</p>
                    </div>
                </div> : null}
                {status === 4 ? <div className={`${styles.stepBox} ${styles.stepResultBox}`}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>选择网络</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>查询结果</p>
                    </div>
                </div> : null}
            </>
        )
    }

    step1 = () => {
        const { t } = this.props
        const { networkType } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="networkSelectGroup">
                            <Form.Label>请选择网络</Form.Label>
                            <Form.Control as="select" value={networkType}
                                onChange={(value) => this.setValue('networkType', value)}>
                                <option value="eth">Ethereum</option>
                                <option value="tron">Tron</option>
                            </Form.Control>

                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.toResult}>查询</Button>
                            <Button variant="gray" onClick={() => this.toClaims(2)}>领取</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    step2 = () => {
        const { t } = this.props
        const { networkType, account, status, signature, darwiniaAddress, airdropNumber } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>已连接至：</span></h1>
                        <p>{account[networkType]}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>快照数据：</span></h1>
                        <p>{formatBalance(airdropNumber)} RING<br />({dayjs.unix(config.SNAPSHOT_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss ZZ')})
                        </p>

                        {status === 3 ? <>
                            <h1><img alt="" src={labelTitleLogo} /><span>Darwinia Crab 网络账号：</span></h1>
                            <p>{darwiniaAddress}</p>
                        </> : null}
                    </div>
                </div>

                {status === 2 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="darwinaAddressGroup">
                            <Form.Label>请输入接收 cRING 的 Darwinia Crab 网络账号 <a href="" target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder="Darwinia Crab 网络账号" value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value)} />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.sign}>提交</Button>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>返回</Button>

                        </div>
                    </div>
                </div> : null}

                {status === 3 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} ${styles.signatureBox} claims-network-box`}>
                        <Form.Group controlId="signatureGroup">
                            <Form.Label>提交成功！请复制下方签名，至达尔文钱包中【领取】页面进行领取操作</Form.Label>
                            <Form.Control as="textarea" value={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                rows="3" />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <CopyToClipboard text={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                onCopy={() => this.onCopied()}>
                                <Button variant="gray">复制签名</Button>
                            </CopyToClipboard>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>返回</Button>
                        </div>
                    </div>
                </div> : null}
            </div>
        )
    }

    step4 = () => {
        const { t } = this.props
        const { networkType, account, airdropNumber } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>已连接至：</span></h1>
                        <p>{account[networkType]}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>快照数据：</span></h1>
                        <p>{formatBalance(airdropNumber)} RING<br />({dayjs.unix(config.SNAPSHOT_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss ZZ')})</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>接收账号：</span></h1>
                        <p>0xxxxxxxxxxxxxxxxxxxxxx</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>映射结果：</span></h1>
                        <p>已领取</p>
                        <div className={styles.buttonBox}>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>返回</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    render() {
        const { t } = this.props
        const { status } = this.state
        return (
            <div>
                <div className={`${styles.header}`}>
                    <a href="/">
                        <div className="container">
                            <img alt="darwina network logo" src={darwiniaLogo} />
                            <span>cRING 映射工具</span>
                        </div>
                    </a>
                </div>
                <div className={`${styles.claim}`}>
                    <Container>
                        <div className={styles.claimBox}>
                            {status === 1 ? this.step1() : null}
                            {status === 2 || status === 3 ? this.step2() : null}
                            {status === 4 ? this.step4() : null}
                            <div className={styles.powerBy}>
                                Powered By Darwinia Network
                            </div>
                        </div>
                        <div className={styles.infoBox}>
                            <div>
                                <img alt="" className={styles.promoteLogo} src={promoteLogo} />
                                <Button variant="color" href="https://darwinia.network/">了解 Darwinia Crab</Button>
                            </div>
                        </div>
                    </Container>
                </div>
                <ToastContainer autoClose={2000} />
            </div>
        );
    }
}

export default withTranslation()(Claims);
