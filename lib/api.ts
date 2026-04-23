export async function callRelay(action: string, payload: any = {}, token?: string) {
  const res = await fetch('/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, token }),
  });
  if (!res.ok) {
    throw new Error('API Error: ' + res.statusText);
  }
  return res.json();
}
