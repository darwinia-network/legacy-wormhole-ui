import React, {Component} from 'react'
import {withTranslation} from "react-i18next";
import styles from './style.module.scss'


class Ball extends Component {
    constructor(props, context) {
        super(props, context);
    }

    render(){
        const {children, text, className} = this.props
        return(
            <div className={styles.box}>
                <h1 className={`${styles.gradientText} ${className}`}>{children}</h1>
            </div>
        )
    }
}


export default withTranslation()(Ball);
