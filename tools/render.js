import path from 'path';
import fetch from 'node-fetch';
import { writeFile, makeDir } from './lib/fs';

const routes = [
    '/faq',
    '/news',
    '/404'
];

async function render() {
    const server = {
        host: 'localhost:5000'
    }

    const cname = 'darwinia.network'
    const dirName = path.join(
        'build',
        '/',
    );
    const dist = path.join(dirName, 'CNAME')
    await writeFile(dist, cname);

    await Promise.all(
        routes.map(async (route, index) => {
            const url = `http://${server.host}${route}`;
            const fileName = route.endsWith('/')
                ? 'index.html'
                : `${path.basename(route, '.html')}.html`;
            const dirName = path.join(
                'build',
                route.endsWith('/') ? route : path.dirname(route),
            );
            const dist = path.join(dirName, fileName);
            const timeStart = new Date();
            const response = await fetch(url);
            const timeEnd = new Date();
            const text = await response.text();
            await makeDir(dirName);
            await writeFile(dist, text);
            const time = timeEnd.getTime() - timeStart.getTime();
            console.info(
                `#${index + 1} ${dist} => ${response.status} ${
                    response.statusText
                    } (${time} ms)`,
            );
        }),
    );
}

export default render;
