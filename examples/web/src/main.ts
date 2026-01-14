import { configureHounddog } from '@hounddog/core';
import { enableHoundFetch } from '@hounddog/fetch';

configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});

enableHoundFetch({ baseFetch: fetch });

const btn = document.getElementById('btn') as HTMLButtonElement;
const out = document.getElementById('out') as HTMLDivElement;

btn.addEventListener('click', async () => {
  out.textContent = 'Calling API...';
  try {
    const res = await fetch('http://localhost:4000/api/hello');
    const json = await res.json();
    out.textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    out.textContent = 'Error: ' + (e as Error).message;
  }
});
