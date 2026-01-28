import { configureHounddog, mark, withFlow } from '@hounddog/core';
import { enableHoundFetch } from '@hounddog/fetch';

configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});

enableHoundFetch();

const btn = document.getElementById('btn') as HTMLButtonElement;
const btnMark = document.getElementById('btn-mark') as HTMLButtonElement;
const btnDb = document.getElementById('btn-db') as HTMLButtonElement;
const btnMarkDb = document.getElementById('btn-mark-db') as HTMLButtonElement;
const out = document.getElementById('out') as HTMLDivElement;

const callApi = async (endpoint: string) => {
  out.textContent = 'Calling API...';
  try {
    const res = await fetch(`http://localhost:4000${endpoint}`);
    const json = await res.json();
    out.textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    out.textContent = 'Error: ' + (e as Error).message;
  }
};

btn.addEventListener('click', () => callApi('/api/hello'));

btnMark.addEventListener('click', () => {
  withFlow(async () => {
    await mark('button.click');
    await callApi('/api/hello');
  });
});

btnDb.addEventListener('click', () => callApi('/api/users'));

btnMarkDb.addEventListener('click', () => {
  withFlow(
    async () => {
      await mark('button.click');
      await callApi('/api/users');
    },
    { label: 'get-users' },
  );
});
