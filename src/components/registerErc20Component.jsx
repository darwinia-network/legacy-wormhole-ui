import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Web3 from "web3";
import { registerToken } from "../page/CrossChain/erc20";

export default function RegisterErc20Token(props) {
    const { t } = useTranslation();
    const [isValid, setIsValid] = useState(true);
    const [address, setAddress] = useState("");

    return (
        <Modal {...props}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {t("crosschain:register erc20 token")}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="show-grid">
                <Form>
                    <Form.Group controlId="address">
                        <Form.Control
                            type="text"
                            required
                            placeholder={t(
                                "crosschain:Enter the contract address of the token"
                            )}
                            onChange={(event) => {
                                const value = event.target.value;
                                const isValid = Web3.utils.isAddress(value);

                                setIsValid(isValid);
                                setAddress(isValid ? value : "");
                            }}
                            isInvalid={!isValid}
                        />
                        <Form.Control.Feedback type="invalid">
                            {t("crosschain:token address is invalid")}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={props.onHide} variant="outline-purple">
                    {t("common:Cancel")}
                </Button>
                <Button
                    type="submit"
                    variant="color"
                    disabled={!isValid || !address}
                    style={{ alignSelf: "stretch" }}
                    onClick={async () => {
                        await registerToken(address);
                        props.onHide();
                    }}
                >
                    {t("common:Confirm")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
