import { useEffect, useState } from 'react';
import { getAllTokens } from '../page/CrossChain/erc20/token';
import { getMetamaskActiveAccount } from '../page/CrossChain/utils';
import { useCancelablePromise } from './cancelablePromise';

/**
 *
 * @param networkType
 * @param status - token register status 1:registered 2:registering
 * @returns
 */
export const useAllTokens = (networkType, status = null) => {
  const [loading, setLoading] = useState(true);
  const [allTokens, setAllTokens] = useState([]);
  const [currentAccount, setCurrentAccount] = useState('');
  const makeCancelable = useCancelablePromise();

  useEffect(() => {
    (async () => {
      const account = await makeCancelable(getMetamaskActiveAccount());

      setCurrentAccount(account);
    })();

    window.ethereum.on('accountsChanged', (accounts) => {
      setCurrentAccount(accounts[0]);
      setAllTokens([]);
    });
  }, [makeCancelable]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const all = await makeCancelable(getAllTokens(currentAccount, networkType));

        setAllTokens(typeof status === 'number' ? all.filter((item) => item.status === status) : all);
      } catch (error) {
        console.error(
          '%c [ error in useAllToken hook ]-56',
          'font-size:13px; background:pink; color:#bf2c9f;',
          error.message
        );
      }

      setLoading(false);
    })();
  }, [currentAccount, makeCancelable, networkType, status]);

  return { loading, allTokens, setAllTokens };
};
