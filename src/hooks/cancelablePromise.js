import { useCallback } from "react";
import { useMountedState } from "./mountedState";

export const useCancelablePromise = () => {
    const isMounted = useMountedState();

    return useCallback(
        (promise, onCancel) =>
            new Promise((resolve, reject) => {
                promise
                    .then((result) => {
                        if (isMounted()) {
                            resolve(result);
                        }
                    })
                    .catch((error) => {
                        if (isMounted()) {
                            reject(error);
                        }
                    })
                    .finally(() => {
                        if (!isMounted() && onCancel) {
                            onCancel();
                        }
                    });
            }),
        [isMounted]
    );
};
