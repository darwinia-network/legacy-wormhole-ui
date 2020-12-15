import React, { Component } from "react";
import { Container, Button } from 'react-bootstrap'
import { withRouter, Link } from 'react-router-dom';

import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Web3 from 'web3';
import _ from 'lodash';
import archorsComponent from '../../components/anchorsComponent'
import { withTranslation } from "react-i18next";
import i18n from '../../locales/i18n';

import styles from "./style.module.scss";
import darwiniaLogo from './img/darwinia-logo.png';
import promoteLogo from './img/promote-logo.png';

import acalaIcon from './img/chain-logo/acala.png';
import crabIcon from './img/chain-logo/crab.png';
import darwiniaIcon from './img/chain-logo/darwinia.png';
import ethereumIcon from './img/chain-logo/ethereum.png';
import kusamaIcon from './img/chain-logo/kusama.png';
import polkadotIcon from './img/chain-logo/polkadot.png';
import tronIcon from './img/chain-logo/tron.png';
import arrowIcon from './img/arrow.svg';
import helpBallIcon from './img/help-ball-icon.png';

import chainMap from './chain';
import CrossChain from '../CrossChain';
import Claim from '../Claims';

// import anime from 'animejs';

const helpUrl = {
    eth_crosschain: 'https://mp.weixin.qq.com/s/c-aVPjDibyfUAHYZo1HW9w',
    tron_crosschain: 'https://mp.weixin.qq.com/s/c-aVPjDibyfUAHYZo1HW9w',
    crab_crosschain: 'https://medium.com/@DarwiniaNetwork/must-read-darwinia-mainnet-progressive-launch-announcement-ff20a04a8bdd'
}

const THREE = window.THREE;
var camera1, camera2, scene1, scene2, renderer1, renderer2;
var isUserInteracting = false,
    lon = 0,
    lat = 0,
    phi = 0,
    theta = 0;
var requestId = undefined;

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

function clearRenderer(){

    [renderer1, renderer2].forEach((renderer) => {
        if(renderer) {
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.context = null;
            renderer.domElement = null;
            renderer = null;
        }
    })
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
    requestId = requestAnimationFrame(animate);
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
    [3, 1, true, true],
    [3, 2, true, false],
    [3, 4, true, false],
    [2, 4, true, false],
    [5, 6, false, false],
    [3, 6, false, false]
]

const styleIdToChainName = ['ethereum', 'crab', 'darwinia', 'tron', 'polkadot', 'kusama', 'acala']

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
            slot: [],
            unlisten: null
        }
    }

    componentDidMount() {
        console.log('wrapper componentDidMount')
        archorsComponent()
        // anime({
        //     targets: '.animeBg',
        //     scale: 1.03,
        //     easing: 'easeInOutQuad',
        //     direction: 'alternate',
        //     loop: true,
        // })

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

        this.routerHandle()

        this.unlisten = this.props.history.listen((location, action) => {
            this.routerHandle(location);
        });
    }

    componentWillUnmount() {
        this.removeBgListener()
        this.unlisten()
    }

    routerHandle = (location) => {
        const {pathname} = location || this.props.location;
        const { status } = this.state;
        if(pathname.indexOf('airdrop') > -1 && status !== 1) {
            this.setState({
                renderPage: 'airdrop',
                status: 1
            });
            return;
        }

        if(pathname.indexOf('crosschain') > -1 && status !== 1) {
            this.setState({
                renderPage: 'crosschain',
                status: 1
            });
            return;
        }

        if(pathname === '/') {
            this.setState({
                status: 0
            },() => {
                this.addBgListener()
            });
        }
    }

    addBgListener = () => {
        const { status } = this.state
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
            this.removeBgListener();
            init();
            animate();
            window.addEventListener('resize', this.debounceLineFn);
        }
    }

    removeBgListener = () => {
        clearRenderer()
        window.removeEventListener('resize', this.debounceLineFn);
        window.removeEventListener('resize', onWindowResize, false);
        if (requestId) {
            cancelAnimationFrame(requestId);
            requestId = undefined;
        }
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
            const isBallActive1 = this.isBallActive(styleIdToChainName[element[0] - 1])
            const isBallActive2 = this.isBallActive(styleIdToChainName[element[1] - 1])
            const isLineActive = isBallActive1[0] && isBallActive2[0] && (isBallActive1[1] === 1 || isBallActive1[1] === 0) && (isBallActive2[1] === 2 || isBallActive2[1] === 0) ;
            const isLineActive2 = isBallActive1[0] && isBallActive2[0] && (isBallActive1[1] === 2 || isBallActive1[1] === 0) && (isBallActive2[1] === 1 || isBallActive2[1] === 0);

            const rectBall1 = document.getElementById(`ball${element[0]}`).getBoundingClientRect()
            const rectBall2 = document.getElementById(`ball${element[1]}`).getBoundingClientRect()
            const rectSVG = document.getElementById('svgBox').getBoundingClientRect()
            if(!rectBall1) return null;
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
            // const translateX = (30 * Math.sin(2 * Math.PI / 360 * theta)) / 2


            const lineColor = [this.getLineColor(element[2]), this.getLineColor(element[3])]
            const dashArray = [this.getDashArray(element[2]), this.getDashArray(element[3])]

            const line2Opacity = isLineActive2 ? "null" : '0.4';
            const lineOpacity = isLineActive ? "null" : '0.4';

            lines.push(<g key={`line${element[0]}-${element[1]}-${lineOpacity}`} transform={`rotate(${theta}, ${pCenter[0] + 3} ${pCenter[1]})`}>
                <line x1={p1[0]} y1={p1[1] + translateY} x2={p2[0]} y2={p2[1] + translateY} style={{ strokeOpacity: lineOpacity, stroke: lineColor[1], strokeWidth: "2",  strokeLinejoin: 'null', fill: 'null', strokeDasharray: dashArray[1], strokeLinecap: "round" }} />
                <polygon points={`${p2[0] + 10} ${p2[1] + translateY},${p2[0]} ${p2[1] - 6 + translateY}, ${p2[0]} ${p2[1] + 6 + translateY}`} style={{ strokeWidth: 0, fill: lineColor[1], fillOpacity: lineOpacity }} />
            </g>)

            lines.push(<g key={`line${element[1]}-${element[0]}-${line2Opacity}`} transform={`rotate(${theta + 180}, ${pCenter[0] + 3} ${pCenter[1]})`}>
                <line x1={p1[0]} y1={p1[1] + translateY} x2={p2[0]} y2={p2[1] + translateY} style={{ stroke: lineColor[0],strokeOpacity: line2Opacity, strokeWidth: "2", fillOpacity: 'null', strokeLinejoin: 'null', fill: 'null', strokeDasharray: dashArray[0], strokeLinecap: "round" }} />
                <polygon points={`${p2[0] + 10} ${p2[1] + translateY},${p2[0]} ${p2[1] - 6 + translateY}, ${p2[0]} ${p2[1] + 6 + translateY}`} style={{ strokeWidth: 0, fill: lineColor[0],fillOpacity: line2Opacity  }} />
            </g>)
        });
        return lines
    }

    getSlotInfo = (relates) => {
        const slotPath = []
        relates.map((element) => {
            const line = document.getElementById(`path-${element[0]}-${element[1]}`)

            const isBallActive1 = this.isBallActive(styleIdToChainName[element[0] - 1])
            const isBallActive2 = this.isBallActive(styleIdToChainName[element[1] - 1])
            const isLineActive = isBallActive1[0] && isBallActive2[0] && (isBallActive1[1] === 1 || isBallActive1[1] === 0) && (isBallActive2[1] === 2 || isBallActive2[1] === 0) ;
            const lineOpacity = isLineActive ? "#43455a" : '#222133';

            if(!line) return null;
            const lineLength = line.getTotalLength()
            const p0 = line.getPointAtLength(lineLength/2)
            const p1 = line.getPointAtLength(lineLength/2 - 2)
            const p2 = line.getPointAtLength(lineLength/2 + 2)
            const theta = Math.atan2(p2.y - p1.y,p2.x - p1.x) * (180 / Math.PI)
            slotPath.push(<defs>
                <mask id={`mask-path-${element[0]}-${element[1]}`}>
                    <circle cx={p0.x} cy={p0.y} r={lineLength/2} fill="white"></circle>
                    <circle cx={p0.x} cy={p0.y} r="10" fill="black"></circle>
                </mask>
            </defs>)
            slotPath.push(<use xlinkHref="#slot" key={`path-${element[0]}-${element[1]}-instant-${lineOpacity}`} id={`path-${element[0]}-${element[1]}-instant`} x={p0.x-8.5} y={p0.y-17} transform={`rotate(${theta+90}, ${p0.x} ${p0.y})`} fill={lineOpacity}>
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

            const isBallActive1 = this.isBallActive(styleIdToChainName[element[0] - 1])
            const isBallActive2 = this.isBallActive(styleIdToChainName[element[1] - 1])
            const isLineActive = isBallActive1[0] && isBallActive2[0] && (isBallActive1[1] === 1 || isBallActive1[1] === 0) && (isBallActive2[1] === 2 || isBallActive2[1] === 0) ;
            const lineOpacity = isLineActive ? "null" : '0.4';

            if(!rectBall1) return null;

            const center1 = [rectBall1.x + (rectBall1.width / 2), rectBall1.y + (rectBall1.height / 2)]
            const center2 = [rectBall2.x + (rectBall2.width / 2), rectBall2.y + (rectBall2.height / 2)]
            const distance12 = Math.sqrt(Math.pow(center1[0] - center2[0], 2) + Math.pow(center1[1] - center2[1], 2))

            const curvetoPath = distance12/1.3;
            lines.push(<g transform={`rotate(${0}, ${parseInt(center1[0])} ${parseInt(center1[1])})`} mask={`url(#mask-path-${element[0]}-${element[1]}`}>
                <path key={`path-${element[0]}-${element[1]}-${lineOpacity}`} id={`path-${element[0]}-${element[1]}`} d={`m${center1[0]-rectSVG.x},${parseInt(center1[1]-rectSVG.y)}C${parseInt(center1[0]-rectSVG.x + curvetoPath)},${parseInt(center1[1]-rectSVG.y - curvetoPath)} ${parseInt(center1[0] -rectSVG.x+ distance12 - curvetoPath)},${parseInt(center2[1]-rectSVG.y + curvetoPath)} ${parseInt(center2[0]-rectSVG.x)},${parseInt(center2[1]-rectSVG.y)}`} style={{strokeWidth: "2"}} stroke="#43455a" strokeOpacity={lineOpacity} fill="none"/>
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

    changeLng = lng => {
        const { i18n } = this.props;
        i18n.changeLanguage(i18n.language.indexOf('en') > -1 ? 'zh-cn' : 'en-us');
        localStorage.setItem("lng", lng);
    }

    checkedBall = (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        this.setState({
            checkedBall: id,
            relatedBall: chainMap[id] || []
        }, () => {
            const lines = this.getLineInfo(lineConfig);
            const path = this.getPathInfo(PathConfig);
            const slot = this.getSlotInfo(PathConfig);
            this.setState({
                lines,
                path,
                slot
            })
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
                                <linearGradient id="svg_8" x1="0" y1="0" x2="1" y2="0">
                                    <stop stopColor="#000" offset="0" />
                                    <stop stopColor="#ffffff" offset="1" />
                                </linearGradient>
                            </defs>
                            <defs>
                                <path stroke="null" d="m7.51084,18.3341l0.00057,2.86487l4.13369,0l-0.00057,-2.86487l3.21509,0l0.00057,2.86487l3.4434,0.00011l0.00077,4.35207c-0.00181,4.38449 -3.27441,8.08257 -7.63603,8.62874l-2.18129,0c-4.36161,-0.5462 -7.63422,-4.24427 -7.63603,-8.62876l0,-4.35205l3.44531,-0.00011l-0.00057,-2.86487l3.21509,0zm3.08558,-17.61409c4.36161,0.5462 7.63422,4.24426 7.63603,8.62875l0,4.35205l-17.45257,0l-0.00077,-4.35207c0.00181,-4.38449 3.27441,-8.08256 7.63603,-8.62874l2.18129,0z" id="slot" strokeWidth="2"/>
                            </defs>
                            {this.state.lines}
                            {this.state.path}
                            {this.state.slot}
                        </svg>
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
        const { history } = this.props
        const { from } = this.state
        history.push(`/airdrop/#${from}`)
        // this.setState({
        //     status: 1,
        //     renderPage: 'airdrop'
        // }, () => {
        //     history.push(`/airdrop/#${from}`)
        // })
    }

    fn_crosschain = () => {
        const { history } = this.props
        const { from } = this.state
        history.push(`/crosschain/#${from}`)
        // this.setState({
        //     status: 1,
        //     renderPage: 'crosschain'
        // }, () => {
        //     history.push(`/crosschain/#${from}`)
        // })
    }

    fn_wrapper = (e, fnname, from, to) => {
        e.stopPropagation()
        this.setState({
            from, to
        }, () => {
            this[`fn_${fnname}`] && this[`fn_${fnname}`]()
        })
    }

    onChangePath = (path) => {
        console.log(path);
        this.setState(path)
    }

    renderHelpUrl = () => {
        const { from, renderPage } = this.state;
        return helpUrl[`${from}_${renderPage}`] || 'https://darwinia.network'
    }

    renderContent = () => {
        const { renderPage } = this.state;
        return (<>
            {renderPage === 'crosschain' ? <CrossChain onChangePath={(path) => {
                this.onChangePath(path)
            }}/> : null}
            {renderPage === 'airdrop' ? <Claim
            onChangePath={(path) => {
                this.onChangePath(path)
            }}/> : null}
        </>)
    }

    hoverBtnAnime = () => {

    }

    renderBall = (id, styleId, isBg = false) => {
        const {t} = this.props;
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
                        return <div className={`${styles[`ball${styleId}Btn`]}`} onClick={(e) => this.fn_wrapper(e, item, checkedBall, id)}>{t(`crosschain:${checkedBall}_${id}_${item}`)}</div>
                    })
                    : null}
                {!isBg && isBallActive[1] === 1 && !(chainMap[`${checkedBall}_${id}`] && chainMap[`${checkedBall}_${id}`].length) && (!chainMap[checkedBall] || !chainMap[checkedBall].length) ?
                    <div className={`${styles[`ball${styleId}Btn`]} ${styles.disableBtn}`}>{t('crosschain:Coming Soon')}</div>
                    : null}
            </>
        )
    }

    renderSubBall = (styleId) => {
        const { checkedBall } = this.state
        const isBallActive = this.isBallActive('subball')
        // const isBallActive = [true]
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
            this.removeBgListener()
        }
        return (
            <div className={styles.wrapperBox}>
                <div className={`${styles.header}`}>
                    <div className={`container ${styles.headerInner}`}>
                        <div>
                            <Link to="/">
                                <img alt="darwina network logo" src={darwiniaLogo} />
                                <span>{t('crosschain:title')}</span>
                            </Link>
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
                            {status === 1 ? this.renderContent() : null}
                            <div className={styles.powerBy}>
                                Powered By Darwinia Network
                            </div>
                            <a className={styles.helpBall} href={this.renderHelpUrl()} target="_blank" rel="noopener noreferrer">
                                <img src={helpBallIcon} alt="help icon"/>
                            </a>
                        </div>
                        <div className={styles.guideBox}>
                            {this.renderGuide(from, to)}
                            {/* <div> */}
                            {/* {i18n.language.indexOf('en') > -1 ? <img alt="" className={styles.promoteLogo} src={promoteLogoEn} /> : <img alt="" className={styles.promoteLogo} src={promoteLogo} />}
                                <Button variant="color" target="_blank" href={t('crosschain:darwinaPage')}>{t('crosschain:About Darwinia')}</Button> */}
                            {/* <a href="javascript:void(0)" onClick={this.changeLng} className={`${styles.changeLng} ${styles.changeLngMobil}`}>
                                    {i18n.language.indexOf('en') > -1 ? '中文' : 'EN'}
                                </a> */}
                            {/* </div> */}
                        </div>
                        <div className={styles.infoBox}>
                            <div>
                                <img alt="" className={styles.promoteLogo} src={promoteLogo} />
                                <Button variant="color" target="_blank" href={t('page:darwinaPage')}>{t('page:About Darwinia')}</Button>
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

export default withRouter(withTranslation()(Claims));
