import type { AddressInfo } from 'node:net';

import type { createGameServer } from '../server/app';

type GameServer = ReturnType<typeof createGameServer>;

/** Let the OS reserve an unused port so parallel test files cannot collide. */
export async function listenOnAvailablePort(server: GameServer): Promise<number> {
  await server.listen(0, '127.0.0.1');
  const address = server.transport.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose a TCP address');
  }
  return (address as AddressInfo).port;
}
