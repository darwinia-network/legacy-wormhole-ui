import React, { Component } from "react";
import { Container, Button, Form } from 'react-bootstrap'

import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import _ from 'lodash';

import { connect, sign, formToast, getAirdropData, config, formatBalance, getClaimsInfo, getTokenBalance, buildInGenesis } from './utils'
import archorsComponent from '../../components/anchorsComponent'
import { withTranslation } from "react-i18next";
import i18n from '../../locales/i18n';

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

import acalaIcon from './img/chain-logo/acala.png';
import crabIcon from './img/chain-logo/crab.png';
import darwiniaIcon from './img/chain-logo/darwinia.png';
import ethereumIcon from './img/chain-logo/ethereum.png';
import kusamaIcon from './img/chain-logo/kusama.png';
import polkadotIcon from './img/chain-logo/polkadot.png';
import tronIcon from './img/chain-logo/tron.png';
import arrowIcon from './img/arrow.svg';

import chainMap from './chain';
import check from "@polkadot/util-crypto/address/check";
import CrossChain from '../CrossChain';
import Claim from '../Claims';

// import anime from 'animejs';

const THREE = window.THREE;
var camera1, camera2, scene1, scene2, renderer1, renderer2;
var isUserInteracting = false,
    lon = 0,
    lat = 0,
    phi = 0,
    theta = 0;



function init() {

    var container1, mesh1;
    var container2, mesh2;

    container1 = document.getElementById('space-container');
    container2 = document.getElementById('space-container-top');

    camera1 = new THREE.PerspectiveCamera(155, window.innerWidth / window.innerHeight, 1, 1500);
    camera1.target = new THREE.Vector3(0, 0, 0);

    camera2 = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1500);
    camera2.target = new THREE.Vector3(0, 0, 0);

    scene1 = new THREE.Scene();
    scene2 = new THREE.Scene();

    var geometry1 = new THREE.SphereGeometry(1500, 160, 40);
    geometry1.scale(-1, 1, 1);

    var geometry2 = new THREE.SphereGeometry(500, 160, 40);
    geometry2.scale(-1, 1, 1);

    THREE.TextureLoader.prototype.crossOrigin = '';

    var material1 = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('https://imgland.oss-cn-hangzhou.aliyuncs.com/photo/2020/882f6f03-0d0a-484d-98b7-44627cfefa22.jpg')
    });

    var material2 = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('https://imgland.oss-cn-hangzhou.aliyuncs.com/photo/2020/957c76cb-2115-48b0-a525-57b4000a48a2.svg')
    });

    mesh1 = new THREE.Mesh(geometry1, material1);
    mesh2 = new THREE.Mesh(geometry2, material2);

    scene1.add(mesh1);
    scene2.add(mesh2);


    renderer1 = new THREE.WebGLRenderer({ alpha: true });
    renderer1.setPixelRatio(window.devicePixelRatio);
    renderer1.setSize(window.innerWidth, window.innerHeight);
    container1.appendChild(renderer1.domElement);

    renderer2 = new THREE.WebGLRenderer({ alpha: true });
    renderer2.setPixelRatio(window.devicePixelRatio);
    renderer2.setSize(window.innerWidth, window.innerHeight);
    container2.appendChild(renderer2.domElement);

    renderer1.domElement.id = 'canvas-bottom';
    renderer2.domElement.id = 'canvas-top';
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera1.aspect = window.innerWidth / window.innerHeight;
    camera1.updateProjectionMatrix();
    renderer1.setSize(window.innerWidth, window.innerHeight);

    camera2.aspect = window.innerWidth / window.innerHeight;
    camera2.updateProjectionMatrix();
    renderer2.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    update();
}

function update() {

    if (isUserInteracting === false) {

        lon += 0.1;

    }

    lat = Math.max(-200, Math.min(100, lat));
    phi = THREE.Math.degToRad(300 - lat);
    theta = THREE.Math.degToRad(lon);

    camera1.target.x = 3000 * Math.sin(phi) * Math.cos(theta);
    camera1.target.y = 3000 * Math.cos(phi);
    camera1.target.z = 500 * Math.sin(phi) * Math.sin(theta);

    camera2.target.x = 1500 * Math.sin(phi) * Math.cos(theta);
    camera2.target.y = 500 * Math.cos(phi);
    camera2.target.z = 500 * Math.sin(phi) * Math.sin(theta);

    camera1.lookAt(camera1.target);
    camera2.lookAt(camera2.target);

    /*
    // distortion
    camera.position.copy( camera.target ).negate();
    */

    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);

}

const chainIcons = {
    acala: acalaIcon,
    crab: crabIcon,
    darwinia: darwiniaIcon,
    ethereum: ethereumIcon,
    kusama: kusamaIcon,
    polkadot: polkadotIcon,
    tron: tronIcon
}

const lineConfig = [ 
    [1, 2, false, true],
    [3, 1, true, false],
    [3, 2, false, false],
    [3, 4, false, false],
    [2, 4, false, false],
    [5, 6, false, false],
    [3, 6, false, false]
]

const PathConfig = [
    [3, 5, true, false],
    [5, 7, true, false]
]

class Claims extends Component {
    constructor(props, context) {
        super(props, context);
        this.debounceLineFn = null;
        this.state = {
            status: 0,
            networkType: 'eth',
            tokenType: 'ring',
            account: {
                eth: '',
                tron: ''
            },
            signature: '',
            darwiniaAddress: '',
            airdropNumber: Web3.utils.toBN(0),
            claimAmount: Web3.utils.toBN(0),
            claimTarget: '',
            hasFetched: false,
            checkedBall: '',
            relatedBall: [],
            from: 'ethereum',
            to: 'darwinia',
            ringBalance: Web3.utils.toBN(0),
            ktonBalance: Web3.utils.toBN(0),
            crossChainBalance: Web3.utils.toBN(0),
            renderPage: 'crosschain',
            lines: [],
            path: [],
            slot: []
        }
    }

    componentDidMount() {
        const { status } = this.state
        archorsComponent()
        // anime({
        //     targets: '.animeBg',
        //     scale: 1.03,
        //     easing: 'easeInOutQuad',
        //     direction: 'alternate',
        //     loop: true,
        // })

        // const rectBall1 = document.getElementById('ball1').getBoundingClientRect()
        // const rectBall2 = document.getElementById('ball2').getBoundingClientRect()
        // console.log(rectBall1, rectBall2);

        this.debounceLineFn = _.debounce(() => {
            const lines = this.getLineInfo(lineConfig)
            const path = this.getPathInfo(PathConfig)
            this.setState({
                lines: lines,
                path
            },() => {
               const slot = this.getSlotInfo(PathConfig)
               this.setState({
                slot
               })
            })
        }, 300, {
            'leading': true,
            'trailing': true
        })
        

        if (status === 0) {
            const lines = this.getLineInfo(lineConfig)
            const path = this.getPathInfo(PathConfig)
            this.setState({
                lines: lines,
                path
            },() => {
               const slot = this.getSlotInfo(PathConfig)
               this.setState({
                slot
               })
            })

            init();
            animate();
            window.addEventListener('resize', this.debounceLineFn);
        }
    }

    componentWillUnmount() {
        this.removeListener()
    }

    removeListener = () => {
        window.removeEventListener('resize', this.debounceLineFn);
        window.removeEventListener('resize', onWindowResize, false);
    }

    getLineColor = (valid) => {
        return valid ? '#D63697' : '#43455A'
    }

    getDashArray = (valid) => {
        return valid ? '' : '5,5'
    }

    getLineInfo = (relates) => {
        let lines = []
        relates.forEach(element => {
            const rectBall1 = document.getElementById(`ball${element[0]}`).getBoundingClientRect()
            const rectBall2 = document.getElementById(`ball${element[1]}`).getBoundingClientRect()
            const rectSVG = document.getElementById('svgBox').getBoundingClientRect()

            const marginRadio = 0.45
            const center1 = [rectBall1.x + (rectBall1.width / 2), rectBall1.y + (rectBall1.height / 2)]
            const center2 = [rectBall2.x + (rectBall2.width / 2), rectBall2.y + (rectBall2.height / 2)]
            const distance12 = Math.sqrt(Math.pow(center1[0] - center2[0], 2) + Math.pow(center1[1] - center2[1], 2))
            const center12 = [(center1[0] + center2[0]) / 2, (center1[1] + center2[1]) / 2]

            let halfLine = (distance12 - (rectBall1.width / 2) - (rectBall2.width / 2)) / 2 * marginRadio
            const p1 = [parseInt((center12[0] - halfLine - rectSVG.x).toFixed(1)), parseInt((center12[1] - rectSVG.y + (rectBall1.width - rectBall2.width) / 4).toFixed(1))]
            const p2 = [parseInt((center12[0] + halfLine - rectSVG.x).toFixed(1)), parseInt((center12[1] - rectSVG.y + (rectBall1.width - rectBall2.width) / 4).toFixed(1))]
            const pCenter = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]

            const theta = Math.atan2((center2[1] - center1[1]), (center2[0] - center1[0])) * (180 / Math.PI)

            const translateY = -8
            const translateX = (30 * Math.sin(2 * Math.PI / 360 * theta)) / 2


            const lineColor = [this.getLineColor(element[2]), this.getLineColor(element[3])]
            const dashArray = [this.getDashArray(element[2]), this.getDashArray(element[3])]
            // translate(${translateX},${translateY})
            // lines.push(<g id="arrow" style ={{transform: [translate(8px, 8px) rotate(${theta}, ${pCenter[0]} ${pCenter[1]}) `}}>
            lines.push(<g id="arrow" transform={`rotate(${theta}, ${pCenter[0] + 3} ${pCenter[1]})`}>
                <line x1={p1[0]} y1={p1[1] + translateY} x2={p2[0]} y2={p2[1] + translateY} style={{ stroke: lineColor[1], strokeWidth: "2", fillOpacity: 'null', strokeLinejoin: 'null', fill: 'null', strokeDasharray: dashArray[1], strokeLinecap: "round" }} />
                {/* <line  x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} style={{ stroke: "url(#svg_8)", strokeWidth: "3"}} /> */}
                {/* <rect x={p1[0]} y={p1[1]-1.5} width={halfLine*2} height={3} style={{ fill: "url(#orange_red)", strokeWidth: "3"}} /> */}
                {/* <rect x={p1[0]} y={p1[1]-1.5} width={halfLine*2} height={3} style={{ fill: "url(#orange_red)", strokeWidth: "3", strokeDasharray:"2 2"}} /> */}
                {/* <line fill="none" stroke="url(#svg_8)" strokeWidth="4.5" x1="133" y1="252.45313" x2="384" y2="85.45313" id="svg_7"  strokeDasharray="5,5"/> */}
                <polygon points={`${p2[0] + 10} ${p2[1] + translateY},${p2[0]} ${p2[1] - 6 + translateY}, ${p2[0]} ${p2[1] + 6 + translateY}`} style={{ strokeWidth: 0, fill: lineColor[1] }} />
            </g>)

            lines.push(<g id="arrow1" transform={`rotate(${theta + 180}, ${pCenter[0] + 3} ${pCenter[1]})`}>
                <line x1={p1[0]} y1={p1[1] + translateY} x2={p2[0]} y2={p2[1] + translateY} style={{ stroke: lineColor[0], strokeWidth: "2", fillOpacity: 'null', strokeLinejoin: 'null', fill: 'null', strokeDasharray: dashArray[0], strokeLinecap: "round" }} />
                <polygon points={`${p2[0] + 10} ${p2[1] + translateY},${p2[0]} ${p2[1] - 6 + translateY}, ${p2[0]} ${p2[1] + 6 + translateY}`} style={{ strokeWidth: 0, fill: lineColor[0] }} />
            </g>)
        });
        // lines.push(<use id="one" x="150" y="110" xlinkHref="#arrow"/>)
        return lines
    }

    getSlotInfo = (relates) => {
        const slotPath = []
        relates.map((element) => {
            const line35 = document.getElementById(`path-${element[0]}-${element[1]}`)
            const line35Length = line35.getTotalLength()
            const p0 = line35.getPointAtLength(line35Length/2)
            const p1 = line35.getPointAtLength(line35Length/2 - 2)
            const p2 = line35.getPointAtLength(line35Length/2 + 2)
            const theta = Math.atan2(p2.y - p1.y,p2.x - p1.x) * (180 / Math.PI)
            
            slotPath.push(<use xlinkHref="#slot" id={`path-${element[0]}-${element[1]}-instant`} x={p0.x-8.5} y={p0.y-17} transform={`rotate(${theta+90}, ${p0.x} ${p0.y})`}>
            </use>)
        })
        return slotPath;
    }

    getPathInfo = (relates) => {
        let lines = []
        relates.forEach(element => {
            const rectBall1 = document.getElementById(`ball${element[0]}`).getBoundingClientRect()
            const rectBall2 = document.getElementById(`ball${element[1]}`).getBoundingClientRect()
            const rectSVG = document.getElementById('svgBox').getBoundingClientRect()

            // const marginRadio = 0.45
            const center1 = [rectBall1.x + (rectBall1.width / 2), rectBall1.y + (rectBall1.height / 2)]
            const center2 = [rectBall2.x + (rectBall2.width / 2), rectBall2.y + (rectBall2.height / 2)]
            const distance12 = Math.sqrt(Math.pow(center1[0] - center2[0], 2) + Math.pow(center1[1] - center2[1], 2))
            // const center12 = [(center1[0] + center2[0]) / 2, (center1[1] + center2[1]) / 2]

            // let halfLine = (distance12 - (rectBall1.width / 2) - (rectBall2.width / 2)) / 2 * marginRadio
            // const p1 = [parseInt((center12[0] - (center12[0] - center1[0])*0.8 - rectSVG.x).toFixed(1)), parseInt((center12[1] - rectSVG.y + (rectBall1.width - rectBall2.width) / 3).toFixed(1))]
            // const p2 = [parseInt((center12[0] + (center2[0] - center12[0])*0.8 - rectSVG.x).toFixed(1)), parseInt((center12[1] - rectSVG.y + (rectBall1.width - rectBall2.width) / 4).toFixed(1))]
            const curvetoPath = distance12/1.3;
            lines.push(<g transform={`rotate(${0}, ${parseInt(center1[0])} ${parseInt(center1[1])})`}>
                <path id={`path-${element[0]}-${element[1]}`} d={`m${center1[0]-rectSVG.x},${parseInt(center1[1]-rectSVG.y)}C${parseInt(center1[0]-rectSVG.x + curvetoPath)},${parseInt(center1[1]-rectSVG.y - curvetoPath)} ${parseInt(center1[0] -rectSVG.x+ distance12 - curvetoPath)},${parseInt(center2[1]-rectSVG.y + curvetoPath)} ${parseInt(center2[0]-rectSVG.x)},${parseInt(center2[1]-rectSVG.y)}`} style={{strokeWidth: "2"}} stroke="#43455a" fill="none"/>
            </g>
            )

        });
        return lines
    }

    setValue = (key, event, fn) => {
        // const encoded = fn(event.target.value);
        this.setState({
            [key]: fn ? fn(event.target.value) : event.target.value
        })
        event.persist()
    }

    toWeiBNMiddleware = (num = 0, unit = 'ether') => {
        try {
            if (num) {
                return Web3.utils.toBN(Web3.utils.toWei(num, unit))
            }
        } catch (error) {
            console.log(error)
            // return Web3.utils.toWei(Web3.utils.toBN('0'))
        }
    }

    toClaims = (status = 2) => {
        const { networkType, account } = this.state;
        const { t } = this.props;
        connect(networkType, (_networkType, _account) => {
            this.setState({
                account: {
                    ...account,
                    [_networkType]: _account
                }
            }, async () => {
                if (this.state.account[_networkType]) {
                    this.setState({
                        status: status
                    })
                    this.airdropData()
                    if (status === 4) {
                        this.queryClaims()
                    }

                    const balances = await getTokenBalance(this.state.account[networkType]);
                    this.setState({
                        ringBalance: Web3.utils.toBN(balances[0]),
                        ktonBalance: Web3.utils.toBN(balances[1]),

                    })
                }
            })
        }, t);
    }

    sign = async () => {
        const { networkType, account, darwiniaAddress } = this.state;
        const { t } = this.props;
        sign(networkType, account[networkType], darwiniaAddress, (signature) => {
            this.setState({
                signature: signature,
                status: 3
            })
        }, t)
    }

    buildInGenesis = () => {
        const { networkType, account, darwiniaAddress, crossChainBalance, tokenType } = this.state;
        const { t } = this.props;
        buildInGenesis(networkType, account[networkType], {
            to: darwiniaAddress,
            value: crossChainBalance,
            tokenType
        }, (signature) => {
            // this.setState({
            //     signature: signature,
            //     status: 3
            // })
        }, t)
    }

    onCopied = () => {
        const { t } = this.props
        formToast(t('crosschain:Copied'))
    }

    toResult = () => {
        this.toClaims(4)
    }

    async queryClaims() {
        const { networkType, account } = this.state;
        const address = networkType === 'eth' ? account[networkType] : (window.tronWeb && window.tronWeb.address.toHex(account[networkType]))
        let json = await getClaimsInfo({
            query: { address: address },
            method: "post"
        });
        if (json.code === 0) {

            if (json.data.info.length === 0) {
                json = {
                    data: {
                        info: [{
                            account: '',
                            target: '',
                            amount: '0'
                        }]
                    }
                }
            };

            this.setState({
                claimAmount: Web3.utils.toBN(json.data.info[0].amount),
                claimTarget: json.data.info[0].target,
                hasFetched: true,
            })
        } else {
        }
    }

    goBack = (status = 1) => {
        if (status === 1) {
            this.setState({
                hasFetched: false
            })
        }
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

    changeLng = lng => {
        const { i18n } = this.props;
        i18n.changeLanguage(i18n.language.indexOf('en') > -1 ? 'zh-cn' : 'en-us');
        localStorage.setItem("lng", lng);
    }

    renderHeader = () => {
        const { status } = this.state;
        const { t } = this.props
        return (
            <>
                {status === 1 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2close} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 2 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 3 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 4 ? <div className={`${styles.stepBox} ${styles.stepResultBox}`}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('crosschain:Result')}</p>
                    </div>
                </div> : null}
            </>
        )
    }

    checkedBall = (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({
            checkedBall: id,
            relatedBall: chainMap[id] || []
        })
    }

    step0 = () => {
        return (
            <div className={`${styles.ballBox}`} onClick={(e) => this.checkedBall('', e)}>
                <div>
                    <div className={`container ${styles.container}`}>
                        <div className={styles.nebula1}></div>
                        <div className={styles.nebula2}></div>
                        {this.renderBall('ethereum', 1)}
                        {this.renderBall('crab', 2)}
                        {this.renderBall('darwinia-bg', 3, true)}
                        {this.renderBall('darwinia', 3)}
                        
                        {this.renderBall('tron', 4)}
                        {this.renderBall('polkadot', 5, true)}
                        {this.renderBall('polkadot', 5)}
                        {this.renderBall('kusama', 6)}
                        {this.renderBall('acala', 7, true)}
                        {this.renderBall('acala', 7)}

                        {this.renderSubBall(1)}
                        {this.renderSubBall(2)}
                        {this.renderSubBall(3)}
                        {this.renderSubBall(4)}
                        {/* <div className={styles.subBall5Box}>
                            {this.renderSubBall(5)}
                        </div> */}
                        <p className={styles.powerLine}>Powered By Darwinia</p>
                        <div id="space-container"></div>
                        <div id="space-container-top"></div>
                        <svg width="100%" height="90vh" version="1.1"
                            id="svgBox"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                {/* <linearGradient id="orange_red" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" style={{stopColor:'#155EDF',
                                stopOpacity:1}}/>
                                <stop offset="100%" style={{stopColor:'#BE29A4',
                                stopOpacity:1}}/>
                                </linearGradient> */}
                                <linearGradient id="svg_8" x1="0" y1="0" x2="1" y2="0">
                                    <stop stopColor="#000" offset="0" />
                                    <stop stopColor="#ffffff" offset="1" />
                                </linearGradient>
                                {/* <linearGradient id='orange_red' x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset='0%' stop-color='red' />
      <stop offset='100%' stop-color='blue' />
    </linearGradient> */}
                            </defs>
                            <defs> 
                                <path stroke="null" d="m7.51084,18.3341l0.00057,2.86487l4.13369,0l-0.00057,-2.86487l3.21509,0l0.00057,2.86487l3.4434,0.00011l0.00077,4.35207c-0.00181,4.38449 -3.27441,8.08257 -7.63603,8.62874l-2.18129,0c-4.36161,-0.5462 -7.63422,-4.24427 -7.63603,-8.62876l0,-4.35205l3.44531,-0.00011l-0.00057,-2.86487l3.21509,0zm3.08558,-17.61409c4.36161,0.5462 7.63422,4.24426 7.63603,8.62875l0,4.35205l-17.45257,0l-0.00077,-4.35207c0.00181,-4.38449 3.27441,-8.08256 7.63603,-8.62874l2.18129,0z" id="slot" fill="#43455a" stroke-width="2"/>
                            </defs>
                            {/* <g id="arrow" style={{stroke: 'black'}} transform="rotate(90, 75, 50)">
                                <line x1="60" y1="50" x2="90" y2="50"/>
                                <polygon points="90 50, 85 45, 85 55"/>
                            </g> */}
                            {/* <use xlinkHref="#arrow" transform="rotate(90, 75, 50)"/> */}

                            {/* <line x1="0" y1="0" x2="300" y2="300" style={{ stroke: '#D63697', 'strokeWidth': 5 }} /> */}
                            {this.state.lines}
                            {this.state.path}
                            {this.state.slot}
                            {/* <path style={{stroke:'#D63697','strokeWidth':2, fill:"#D63697"}} d="M155.88 166L248.35 311.62L238.68 317.85L258.35 324.03L261.98 305.09L254.59 308.95L162.79 161.22L155.88 166Z" id="c2ROIfcfpV"></path> */}
                        </svg>
                    </div>
                </div>
            </div>
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
                            <Form.Label>{t('crosschain:Select Chain')}</Form.Label>
                            <Form.Control as="select" value={networkType}
                                onChange={(value) => this.setValue('networkType', value)}>
                                <option value="eth">Ethereum -> Darwinia MainNet</option>
                                <option value="tron">Tron -> Darwinia MainNet</option>
                            </Form.Control>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.toResult}>{t('crosschain:search')}</Button>
                            <Button variant="gray" onClick={() => this.toClaims(2)}>{t('crosschain:claim')}</Button>
                        </div>
                    </div>
                </div>
                <div className={styles.formBox}>
                    <div className={styles.stepRoadMap}>
                        <h3>{t('跨链转账路线图：')}</h3>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段1: 创世跨链</p>
                                <p>2020.05.30 - 2020.06.30</p>
                            </div>
                            <p>此阶段的跨链转账，将在 Darwinia 主网上线后到账，通过 Genesis Block 发至指定账号</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段2: 单向跨链</p>
                                <p>2020 Q3</p>
                            </div>
                            <p>此阶段的跨链转账，立即到账（可能存在一定的网络延迟），但仅支持发至Darwinia 主网的单项转账</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段3: 多向跨链</p>
                                <p>2020 Q3 - Q4</p>
                            </div>
                            <p>此阶段的跨链转账，立即到账（可能存在一定的网络延迟），且支持双向或多向转账</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    step2 = () => {
        const { t } = this.props
        const { networkType, account, status, signature, darwiniaAddress, ringBalance, ktonBalance, tokenType, crossChainBalance } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>

                        {status === 3 ? <>
                            <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Darwinia Crab Network account')}：</span></h1>
                            <p>{darwiniaAddress}</p>
                        </> : null}
                    </div>
                </div>

                {status === 2 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="darwinaAddressGroup">
                            <Form.Label>{t('crosschain:Please enter the account of Darwinia Crab')} <a href={this.renderHelpUrl()} target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder={t('crosschain:Darwinia Crab Network account')} value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value)} />
                            <Form.Text className="text-muted">
                                请务必填写真实的 Darwinia 主网账号，并妥善保管助记词等账号恢复文件。
                            </Form.Text>

                            <Form.Label>映射通证</Form.Label>
                            <Form.Control as="select" value={tokenType}
                                onChange={(value) => this.setValue('tokenType', value)}>
                                <option value="ring">RING(MAX {formatBalance(ringBalance, 'ether')})</option>
                                <option value="kton">KTON(MAX {formatBalance(ktonBalance, 'ether')})</option>
                            </Form.Control>

                            <Form.Label>映射数量</Form.Label>
                            <Form.Control type="number" placeholder={t('crosschain:Darwinia Crab Network account')} value={formatBalance(crossChainBalance, 'ether') === '0' ? '' : formatBalance(crossChainBalance, 'ether')}
                                onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware)} />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.buildInGenesis}>{t('crosschain:Submit')}</Button>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}

                {status === 3 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} ${styles.signatureBox} claims-network-box`}>
                        <Form.Group controlId="signatureGroup">
                            <Form.Label>{t('crosschain:Success! Please copy the signature below, and [claim] in Darwinia Wallet')}</Form.Label>
                            <Form.Control as="textarea" value={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                rows="3" />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <CopyToClipboard text={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                onCopy={() => this.onCopied()}>
                                <Button variant="gray">{t('crosschain:Copy signature')}</Button>
                            </CopyToClipboard>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}
            </div>
        )
    }

    step4 = () => {
        const { t } = this.props
        const { networkType, account, airdropNumber, claimTarget, claimAmount, hasFetched } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Snapshot data')}：</span></h1>
                        <p>{claimAmount.eqn(0) ? formatBalance(airdropNumber) : formatBalance(claimAmount)} RING<br />({dayjs.unix(config.SNAPSHOT_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss ZZ')})</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Destination')}：</span></h1>
                        <p>{claimTarget || '----'}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Claims Result')}：</span></h1>
                        <p>{hasFetched ? (claimTarget ? t('crosschain:Claims') : t('crosschain:Not claimed')) : '----'}</p>
                        <div className={styles.buttonBox}>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    isBallActive = (id) => {
        const { relatedBall, checkedBall } = this.state;
        if (!checkedBall || checkedBall === id) {
            return [true, checkedBall === id ? 1 : 0]
        }
        const isRelatedBall = relatedBall.includes(id)
        return [isRelatedBall, isRelatedBall ? 2 : -1]
    }


    fn_airdrop = () => {
        this.setState({
            status: 1,
            renderPage: 'airdrop'
        })
    }

    fn_crosschain = () => {
        this.setState({
            status: 1,
            renderPage: 'crosschain'
        })
    }

    fn_wrapper = (e, fnname, from, to) => {
        e.stopPropagation()
        this[`fn_${fnname}`] && this[`fn_${fnname}`]()
        this.setState({
            from, to
        })
    }

    renderContent = () => {
        const { renderPage } = this.state;
        return (<>
            {renderPage === 'crosschain' ? <CrossChain /> : null}
            {renderPage === 'airdrop' ? <Claim /> : null}
        </>)
    }

    hoverBtnAnime = () => {

    }

    renderBall = (id, styleId, isBg = false) => {
        const { checkedBall } = this.state
        const isBallActive = this.isBallActive(id)
        const isDisableBallClass = (isBg || isBallActive[0]) ? '' : styles.disableBall
        const isBgClass = !isBg  ? styles.ballInstant : styles.ballIsBg
        // const isDisableBallShadowClass = isBallActive[0] ? '' : styles.disableBallShadow
        return (
            <>
                <div className={styles.scaleBox}>
                    <div id={`ball${styleId}`} className={`${styles['ball' + styleId]} ${isBgClass} ${styles[`ballbg-${id}`]} ${isDisableBallClass}`} onClick={(e) => {if(isBg) return; this.checkedBall(id, e)}}>
                        {!isBg ? <img className={styles.ballIcon} src={chainIcons[id]} alt="chain logo" /> : null}
                        {!isBg ? <p>{id}</p> : null}
                    </div>
                    {/* <div className={`animeBg ${styles[`ball${styleId}Shadow`]}  ${isDisableBallShadowClass}`}></div> */}
                </div>
                {!isBg && isBallActive[1] === 2 && chainMap[`${checkedBall}_${id}`] && chainMap[`${checkedBall}_${id}`].length ?
                    chainMap[`${checkedBall}_${id}`].map((item) => {
                        return <div className={`${styles[`ball${styleId}Btn`]}`} onClick={(e) => this.fn_wrapper(e, item, checkedBall, id)}>{item}</div>
                    })
                    : null}
                {!isBg && isBallActive[1] === 1 && !(chainMap[`${checkedBall}_${id}`] && chainMap[`${checkedBall}_${id}`].length) && (!chainMap[checkedBall] || !chainMap[checkedBall].length) ?
                    <div className={`${styles[`ball${styleId}Btn`]} ${styles.disableBtn}`}>敬请期待</div>
                    : null}
            </>
        )
    }

    renderSubBall = (styleId) => {
        const { checkedBall } = this.state
        // const isBallActive = this.isBallActive(id)
        const isBallActive = [true]
        const isDisableBallClass = isBallActive[0] ? '' : styles.disableBall
        return (
            <>
                <div className={styles.scaleBox}>
                    <div className={`${styles['subBall' + styleId]} ${isDisableBallClass}`}>
                    </div>
                </div>
            </>
        )
    }

    renderHelpUrl = () => {
        const lng = i18n.language.indexOf('en') > -1 ? 'en' : 'zh-CN'
        return `https://docs.darwinia.network/docs/${lng}/crab-tut-claim-cring`
    }

    renderGuide = (from, to) => {
        const fromStyleId = 'From';
        const toStyleId = 'To';
        const isDisableBallClass = '', isDisableBallShadowClass = '';

        return (<div>
            <div className={`${styles['ball' + fromStyleId]} ${styles[`ballbg-${from}`]} ${isDisableBallClass}`}>
                <img className={styles.ballIcon} src={chainIcons[from]} alt="chain logo" />
                <p>{from}</p>
            </div>
            <img className={styles.arrow} src={arrowIcon} alt=""/>
            {/* <div className={`${styles[`ball${fromStyleId}Shadow`]} ${isDisableBallShadowClass}`}></div> */}
            <div className={`${styles['ball' + toStyleId]} ${styles[`ballbg-${to}`]} ${isDisableBallClass}`}>
                <img className={styles.ballIcon} src={chainIcons[to]} alt="chain logo" />
                <p>{to}</p>
            </div>
            {/* <div className={`${styles[`ball${toStyleId}Shadow`]} ${isDisableBallShadowClass}`}></div> */}
        </div>)
    }

    render() {
        const { t } = this.props
        const { status, from, to } = this.state
        if (status !== 0) {
            this.removeListener()
        }
        return (
            <div className={styles.wrapperBox}>
                <div className={`${styles.header}`}>
                    <div className={`container ${styles.headerInner}`}>
                        <div>
                            <a href="/">
                                <img alt="darwina network logo" src={darwiniaLogo} />
                                <span>{t('crosschain:title')}</span>
                            </a>
                        </div>
                        <div>
                            <a href="javascript:void(0)" onClick={this.changeLng} className={styles.changeLng}>
                                {i18n.language.indexOf('en') > -1 ? '中文' : 'EN'}
                            </a>
                        </div>
                    </div>
                </div>
                {status === 0 ? this.step0() : null}
                {status !== 0 ? <div className={`${styles.claim}`}>
                    <Container>
                        <div className={styles.claimBox}>
                            {/* {status === 1 ? this.step1() : null} */}
                            {status === 1 ? this.renderContent() : null}
                            {/* {status === 2 || status === 3 ? this.step2() : null}
                            {status === 4 ? this.step4() : null} */}
                            <div className={styles.powerBy}>
                                Powered By Darwinia Network
                            </div>
                        </div>
                        <div className={styles.guideBox}>
                            {this.renderGuide(from, to)}
                            {/* <div> */}
                            {/* {i18n.language.indexOf('en') > -1 ? <img alt="" className={styles.promoteLogo} src={promoteLogoEn} /> : <img alt="" className={styles.promoteLogo} src={promoteLogo} />}
                                <Button variant="color" target="_blank" href={t('crosschain:darwinaPage')}>{t('crosschain:About Darwinia Crab')}</Button> */}
                            {/* <a href="javascript:void(0)" onClick={this.changeLng} className={`${styles.changeLng} ${styles.changeLngMobil}`}>
                                    {i18n.language.indexOf('en') > -1 ? '中文' : 'EN'}
                                </a> */}
                            {/* </div> */}
                        </div>
                        <div className={styles.infoBox}>
                            <div>
                                <img alt="" className={styles.promoteLogo} src={promoteLogo} />
                                <Button variant="color" target="_blank" href={t('page:darwinaPage')}>{t('page:About Darwinia Crab')}</Button>
                                {/* <a href="javascript:void(0)" onClick={this.changeLng} className={`${styles.changeLng} ${styles.changeLngMobil}`}>
                                    {i18n.language.indexOf('en') > -1 ? '中文' : 'EN'}
                                </a> */}
                            </div>
                        </div>
                    </Container>
                </div> : null}
                <ToastContainer autoClose={2000} />
            </div>
        );
    }
}

export default withTranslation()(Claims);
