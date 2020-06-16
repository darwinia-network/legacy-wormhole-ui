import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import i18n from './locales/i18n';
import App from './App';
import * as serviceWorker from './serviceWorker';
import {withTranslation} from "react-i18next";

const TransApp = withTranslation()(App)
ReactDOM.render(<TransApp/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
