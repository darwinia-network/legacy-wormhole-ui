import React, { useState, useEffect } from "react";
import { ListGroup, Spinner, Modal, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Web3 from "web3";
import "./erc20TokenComponent.scss";
import { config, toShortAccount } from "../../page/CrossChain/utils";
import { getAllTokens } from "../../page/CrossChain/erc20/token";
import JazzIcon from "../jazzIcon/JazzIconComponent";

export default function Erc20Token(props) {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [tipMsg, setTipMsg] = useState(
        t(
            "Tips After submit the registration, please wait for the {{type}} network to return the result, click [Upcoming] to view the progress.",
            { type: config.NETWORK_NAME }
        )
    );
    const facade = [
        {
            title: t("crosschain:Select a token"),
            icon: null,
            content: <SearchToken />,
            footer: (
                <Button
                    onClick={() => {
                        setStep(1);
                    }}
                    variant="link"
                >
                    {"💻 "}
                    {t("common:Manage")}
                </Button>
            ),
        },
        {
            title: t("common:Manage"),
            icon: (
                <span
                    className="back"
                    onClick={() => {
                        if (step > 0) {
                            setStep(step - 1);
                        }
                    }}
                >
                    ⬅
                </span>
            ),
            content: (
                <Manager
                    onTabChange={(index) => {
                        const messages = [
                            "Tips After submit the registration, please wait for the {{type}} network to return the result, click [Upcoming] to view the progress.",
                            "Tips After {{type}} network returns the result, click [Confirm] to complete the token registration.",
                        ];

                        setTipMsg(messages[index], {
                            type: config.NETWORK_NAME,
                        });
                    }}
                />
            ),
            footer: <p className="tip">{t(tipMsg, { type: "" })}</p>,
        },
    ];

    return (
        <Modal
            {...props}
            onHide={() => {
                props.onHide();
                setStep(0);
            }}
            backdrop="static"
            className="erc20-token-select"
        >
            <Modal.Header closeButton>
                {facade[step].icon}
                <Modal.Title>{facade[step].title}</Modal.Title>
            </Modal.Header>

            <Modal.Body>{facade[step].content}</Modal.Body>

            <Modal.Footer>{facade[step].footer}</Modal.Footer>
        </Modal>
    );
}

function SearchToken() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [allTokens, setAllTokens] = useState([]);
    const [display, setDisplay] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const all = await getAllTokens();

                setAllTokens(all);
                setDisplay(all);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <>
            <Form>
                <Form.Group controlId="address">
                    <Form.Control
                        type="text"
                        required
                        placeholder={t(
                            "crosschain:Search name or paste address"
                        )}
                        onChange={(event) => {
                            const value = event.target.value;

                            if (!value) {
                                setDisplay(allTokens);
                            }

                            const isAddress = Web3.utils.isAddress(value);

                            if (isAddress) {
                                setDisplay(
                                    allTokens.filter(
                                        (token) => token.address === value
                                    )
                                );
                            } else {
                                setDisplay(
                                    allTokens.filter((token) =>
                                        token.symbol
                                            .toLowerCase()
                                            .includes(value.toLowerCase())
                                    )
                                );
                            }
                        }}
                    />
                </Form.Group>
            </Form>

            {loading ? (
                <Spinner
                    animation="border"
                    role="status"
                    className="spinner"
                ></Spinner>
            ) : (
                <ListGroup className="token-list">
                    {display.map((token) => {
                        const { symbol, address, logo } = token;

                        return (
                            <ListGroup.Item key={token.address}>
                                <div>
                                    {!!logo ? (
                                        <img src={`/images/${logo}`} alt="" />
                                    ) : (
                                        <JazzIcon address={address}></JazzIcon>
                                    )}
                                    <div>
                                        <h6>{symbol}</h6>
                                        <p>{toShortAccount(address)}</p>
                                    </div>
                                </div>

                                <span>amount: 999</span>
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            )}
        </>
    );
}

function Manager(props) {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const { token, setToken } = useState(null);
    const onTabClick = (index) => {
        return (event) => {
            setActive(index);

            if (props.onTabChange) {
                props.onTabChange(index);
            }
        };
    };
    return (
        <>
            <div className="tab-container">
                <span
                    className={`tab ${active === 0 ? "active" : ""}`}
                    onClick={onTabClick(0)}
                >
                    {t("crosschain:Register")}
                </span>
                <span
                    className={`tab ${active === 1 ? "active" : ""}`}
                    onClick={onTabClick(1)}
                >
                    {t("crosschain:Upcoming")}
                </span>
            </div>

            {active === 0 && (
                <>
                    <Form className="register-control">
                        <Form.Group controlId="address">
                            <Form.Label>
                                {t("crosschain:Token Contract Address")}
                            </Form.Label>
                            <Form.Control type="text" required />
                        </Form.Group>
                    </Form>

                    <div className="token-info">
                        <h6>{t("Token Info")}</h6>

                        <div className="info">
                            <b>{t("Symbol")}</b>
                            <span>{token?.symbol}</span>
                        </div>

                        <div className="info">
                            <b>{t("Decimals of Precision")}</b>
                            <span>{token?.decimals}</span>
                        </div>
                    </div>

                    <Button variant="secondary" className="submit-btn">
                        {t("common:Submit")}
                    </Button>
                </>
            )}

            {active === 1 && (
                <>
                    <Form className="register-search">
                        <Form.Group controlId="address">
                            <Form.Control type="text" />
                        </Form.Group>
                    </Form>

                    <ListGroup className="token-list">
                        <ListGroup.Item>
                            <div>
                                <img src={''} alt="" />
                                <div>
                                    <h6>DAI</h6>
                                    <p>Dai Stablecoin</p>
                                </div>
                            </div>

                            <Button variant="outline-dark" size="sm">
                                {t("Confirm")}
                            </Button>
                        </ListGroup.Item>
                    </ListGroup>
                </>
            )}
        </>
    );
}
