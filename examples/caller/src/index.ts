import { run, mark } from '@hounddog/core';
import { houndFetch } from '@hounddog/fetch';

const fetchWithHound = houndFetch(globalThis.fetch.bind(globalThis));

async function main() {
  await run('FE.action.demo', async () => {
    await mark('FE.beforeCall');
    const res = await fetchWithHound('http://localhost:4000/api/hello');
    const json = await res.json();
    // eslint-disable-next-line no-console
    console.log('API says:', json);
    await mark('FE.afterCall');
  });
}

void main();
