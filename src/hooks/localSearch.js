import { useEffect, useState } from "react";

export function useLocalSearch(filterFn) {
    const [search, setSearch] = useState("");
    const [data, setData] = useState([]);

    useEffect(() => {
        const result = filterFn(search);

        setData(result);
    }, [filterFn, search]);

    return { search, setSearch, data };
}
