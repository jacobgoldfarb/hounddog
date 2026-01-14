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
const out = document.getElementById('out') as HTMLDivElement;
const btnMark = document.getElementById('btn-mark') as HTMLButtonElement;

const callApi = async () => {
  out.textContent = 'Calling API...';
  try {
    const res = await fetch('http://localhost:4000/api/hello');
    const json = await res.json();
    out.textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    out.textContent = 'Error: ' + (e as Error).message;
  }
};
btn.addEventListener('click', async () => {
  await callApi();
});

const markBtn = async () => {
  withFlow(async () => {
    await mark('FE.button.click');
    await callApi();
  }, 'slow-turtle');
};

btnMark.addEventListener('click', markBtn);
