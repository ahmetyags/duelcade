/**
 * React Native/Web shim for @colyseus/sdk's optional Node.js `ws` import.
 * Both platforms already provide a standards-compatible global WebSocket.
 */
module.exports = globalThis.WebSocket;
module.exports.default = globalThis.WebSocket;
