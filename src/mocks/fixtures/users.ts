import type { User, Wallet } from '@/shared/api/types'

export interface UserRecord extends User {
  passwordSalt: string
  passwordHash: string
}

// Senha das duas contas: Senha@123. Só o hash fica guardado:
// sha256(salt + ":" + senha), calculado em src/mocks/crypto.ts.
export function createUserFixtures(): UserRecord[] {
  return [
    {
      id: 'usr_alice',
      email: 'alice@example.com',
      displayName: 'Alice Martins',
      username: 'alice',
      ensName: 'alice',
      walletNickname: 'Cofre da Alice',
      avatarUrl: null,
      passwordSalt: '9f2c41d7a0b3',
      passwordHash:
        '5900984e403c91cc395bc96f649c84fc292e3003ce52961393128503a7cafcb4',
    },
    {
      id: 'usr_bob',
      email: 'bob@example.com',
      displayName: 'Bob Ferreira',
      username: 'bob',
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      passwordSalt: '5e81aa3c6d20',
      passwordHash:
        'ebb6c9937242b9730f107c4e362e5b647fdfc795ff252ee54a1ecbc53e6543d2',
    },
  ]
}

export function createWalletFixtures(): Record<string, Wallet[]> {
  return {
    usr_alice: [
      {
        id: 'wal_alice_main',
        slot: 'primary',
        nickname: 'Cofre da Alice',
        network: 'ethereum',
        address: '0x7A42c1F9d3B6e8A0b5C4d2E1f09a8B7c6D5e19E8',
        provider: 'metamask',
        ensName: 'alice',
      },
    ],
    usr_bob: [],
  }
}
