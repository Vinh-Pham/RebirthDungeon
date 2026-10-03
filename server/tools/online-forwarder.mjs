import { createServer, request } from 'node:http';
import { createServer as createPortReservation } from 'node:net';

export async function internalPort() {
  const reservation = createPortReservation();
  await new Promise((accept, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', accept);
  });
  const port = reservation.address().port;
  await new Promise((accept) => reservation.close(accept));
  return port;
}
/** Keep workerd's own traffic on loopback while exposing only the app on the chosen LAN interface. */
export async function forwardWorker({ host, port, workerPort }) {
  const upstreams = new Set();
  const server = createServer((incoming, outgoing) => {
    if ((incoming.url ?? '').startsWith('/cdn-cgi/local/')) {
      outgoing.writeHead(404, { 'Cache-Control': 'no-store' });
      outgoing.end();
      incoming.resume();
      return;
    }
    const upstream = request(
      {
        hostname: '127.0.0.1',
        port: workerPort,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    upstreams.add(upstream);
    upstream.once('close', () => upstreams.delete(upstream));
    upstream.once('error', () => {
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }
      outgoing.writeHead(503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Retry-After': '1',
      });
      outgoing.end(
        JSON.stringify({
          message: 'The local Worker is starting or unavailable.',
        }),
      );
    });
    upstream.setTimeout(20000, () => upstream.destroy());
    outgoing.once('close', () => upstream.destroy());
    incoming.once('error', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, host, accept);
  });
  let closing;
  return {
    port: server.address().port,
    close() {
      return (closing ??= new Promise((accept) => {
        server.close(accept);
        server.closeAllConnections();
        for (const upstream of upstreams) upstream.destroy();
      }));
    },
  };
}
