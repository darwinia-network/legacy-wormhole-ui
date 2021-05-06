import React from "react";
import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export default function AssetControl(props) {
    const { t } = useTranslation();

    return (
        <>
            <Form.Label>{t("crosschain:Asset Types")}</Form.Label>
            <Form.Control
                as="select"
                value={props.tokenType}
                onChange={props.onChange}
            >
                <option value="ring">RING</option>
                <option value="kton">KTON</option>
                {props.displayDeposit ? (
                    <option value="deposit">{t("crosschain:Deposit")}</option>
                ) : null}
                <option value="erc20">ERC-20</option>
            </Form.Control>
        </>
    );
}
