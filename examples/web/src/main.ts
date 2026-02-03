import { configureHounddog, mark, withFlow } from '@tailchi/core';
import { enableHoundFetch } from '@tailchi/fetch';

configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});

enableHoundFetch();

const out = document.getElementById('out') as HTMLDivElement;

const setOutput = (text: string, state: 'loading' | 'success' | 'error' | 'idle' = 'idle') => {
  out.textContent = text;
  out.className = state;
};

const callApi = async (endpoint: string): Promise<unknown> => {
  const res = await fetch(`http://localhost:4000${endpoint}`);
  return res.json();
};

const runFlow = (label: string, fn: () => Promise<void>) => {
  withFlow(
    async () => {
      await mark('ui.click', { button: label });
      await fn();
    },
    { label },
  );
};

document.getElementById('btn-hello')!.addEventListener('click', () => {
  runFlow('hello', async () => {
    setOutput('Calling /api/hello...', 'loading');
    const data = await callApi('/api/hello');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-users')!.addEventListener('click', () => {
  runFlow('get-users', async () => {
    setOutput('Fetching users...', 'loading');
    const data = await callApi('/api/users');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-slow')!.addEventListener('click', () => {
  runFlow('slow-operation', async () => {
    setOutput('Starting slow operation (3+ seconds)...', 'loading');
    const data = await callApi('/api/slow');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-parallel')!.addEventListener('click', () => {
  runFlow('parallel-tasks', async () => {
    setOutput('Running parallel tasks...', 'loading');
    const data = await callApi('/api/parallel');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-retry')!.addEventListener('click', () => {
  runFlow('retry-logic', async () => {
    setOutput('Attempting with retry logic...', 'loading');
    const data = await callApi('/api/retry');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-nested')!.addEventListener('click', () => {
  runFlow('nested-ops', async () => {
    setOutput('Running nested operations...', 'loading');
    const data = await callApi('/api/nested');
    setOutput(JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-multi')!.addEventListener('click', () => {
  runFlow('multi-step', async () => {
    setOutput('Step 1/3: Fetching hello...', 'loading');
    await mark('multi.step', { step: 1, action: 'hello' });
    await callApi('/api/hello');

    setOutput('Step 2/3: Fetching users...', 'loading');
    await mark('multi.step', { step: 2, action: 'users' });
    await callApi('/api/users');

    setOutput('Step 3/3: Running parallel...', 'loading');
    await mark('multi.step', { step: 3, action: 'parallel' });
    const data = await callApi('/api/parallel');

    setOutput('Multi-step flow complete!\n\n' + JSON.stringify(data, null, 2), 'success');
  });
});

document.getElementById('btn-error')!.addEventListener('click', () => {
  runFlow('trigger-error', async () => {
    setOutput('Triggering error...', 'loading');
    try {
      await callApi('/api/error');
      setOutput('Error endpoint returned (check status)', 'error');
    } catch (e) {
      setOutput('Error: ' + (e as Error).message, 'error');
    }
  });
});
