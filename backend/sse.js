/* =============================================
   BLAZE KITCHEN — sse.js
   Server-Sent Events broadcaster
   Admin clients  = authenticated admin panel
   Public clients = unauthenticated frontend pages
   ============================================= */

const adminClients  = new Set();
const publicClients = new Set();

/* ──────── Admin (authenticated) ──────── */

/** Register an admin SSE response stream */
exports.addClient = (res) => adminClients.add(res);

/** Remove a disconnected admin client */
exports.removeClient = (res) => adminClients.delete(res);

/** Push an event to ALL connected admin clients */
exports.broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...adminClients]) {
    try { res.write(payload); }
    catch { adminClients.delete(res); }
  }
};

exports.clientCount = () => adminClients.size;

/* ──────── Public (frontend — no auth) ──────── */

/** Register a public SSE response stream */
exports.addPublicClient = (res) => publicClients.add(res);

/** Remove a disconnected public client */
exports.removePublicClient = (res) => publicClients.delete(res);

/** Push an event to ALL connected public (frontend) clients */
exports.broadcastPublic = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...publicClients]) {
    try { res.write(payload); }
    catch { publicClients.delete(res); }
  }
};

exports.publicClientCount = () => publicClients.size;

/* ──────── Broadcast to BOTH admin + public ──────── */
exports.broadcastAll = (event, data) => {
  exports.broadcast(event, data);
  exports.broadcastPublic(event, data);
};
