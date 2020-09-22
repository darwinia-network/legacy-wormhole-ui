import React, {Component} from 'react'
import {withTranslation} from "react-i18next";
import styles from './style.module.scss'


class InputRightWrap extends Component {
    constructor(props, context) {
        super(props, context);
    }

    render(){
        const {children, text, onClick} = this.props
        return(
            <div className={styles.box}>
                {children}
                <span onClick={onClick} className={styles.max}>{text}</span>
            </div>
        )
    }
}


export default withTranslation()(InputRightWrap);
