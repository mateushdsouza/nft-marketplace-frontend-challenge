import type {
  Category,
  EditionKind,
  Network,
  Nft,
  NftEdition,
} from '@/shared/api/types'

const IMAGES = [
  '/nfts/nft-01.webp',
  '/nfts/nft-02.webp',
  '/nfts/nft-03.webp',
  '/nfts/nft-04.webp',
]

const CATEGORIES: Category[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

const NETWORK_NAME: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const COLLECTIONS = ['Kurio Apes', 'Kurio Editions', 'Golden Sound', 'Nomads']

const ATTRIBUTES = [
  ['Óculos', 'Esmeralda', 'Raro'],
  ['Chapéu', 'Moletom', 'Comum'],
  ['Terno', 'Gola alta', 'Épico'],
  ['Fone', 'Jaqueta', 'Incomum'],
]

// Os 9 primeiros reproduzem a grade do Figma (nome, preço e arte).
const FIGMA_ITEMS: Array<{
  name: string
  image: number
  price: string
  previous?: string
}> = [
  { name: 'Emerald Ape #042', image: 0, price: '1.19' },
  { name: 'Sage Nomad #009', image: 1, price: '1.69' },
  { name: 'Neon Vessel #552', image: 2, price: '1.99', previous: '2.29' },
  { name: 'Cosmic Bloom #118', image: 1, price: '1.29' },
  { name: 'Violet Nomad #314', image: 1, price: '1.39' },
  { name: 'Ivory Baron #088', image: 2, price: '1.79' },
  { name: 'Golden Beat #207', image: 3, price: '0.99' },
  { name: 'Golden Frequency #071', image: 3, price: '0.59' },
  { name: 'Golden Signal #160', image: 3, price: '0.39' },
]

const ADJECTIVES = [
  'Amber',
  'Copper',
  'Velvet',
  'Silent',
  'Crimson',
  'Lunar',
  'Rust',
  'Hidden',
  'Wild',
  'Quiet',
  'Solar',
]
const NOUNS = [
  'Ape',
  'Nomad',
  'Baron',
  'Signal',
  'Vessel',
  'Bloom',
  'Echo',
  'Monk',
]

const TOTAL = 40

function editionsFor(id: string, i: number): NftEdition[] {
  const kinds: Array<[EditionKind, number]> = [
    ['1/1', i % 4 === 2 ? 0 : 1],
    ['1/10', i % 7 === 3 ? 0 : 3 + (i % 5)],
    ['1/50', 10 + (i % 15)],
    ['aberta', 99],
  ]
  return kinds.map(([kind, available]) => ({
    id: `${id}_${kind === 'aberta' ? 'open' : kind.replace('/', '-')}`,
    kind,
    available,
  }))
}

function priceFor(i: number): string {
  const cents = 2 + ((i * 137) % 1228)
  return (cents / 100).toFixed(2)
}

function buildNft(i: number): Nft {
  const id = `nft_${String(i + 1).padStart(3, '0')}`
  const figma = FIGMA_ITEMS[i]
  const imageIndex = figma ? figma.image : i % IMAGES.length
  const number = String((i * 53 + 17) % 1000).padStart(3, '0')
  const name = figma
    ? figma.name
    : `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[(i * 3) % NOUNS.length]} #${number}`
  const network = NETWORKS[i % NETWORKS.length]
  const tokenNumber = name.split('#')[1] ?? number
  const createdAt = new Date(Date.UTC(2026, 9, 31) - i * 86_400_000)

  return {
    id,
    tokenId: `#${tokenNumber.padStart(4, '0')}`,
    name,
    collection: COLLECTIONS[imageIndex],
    category: CATEGORIES[i % CATEGORIES.length],
    network,
    image: IMAGES[imageIndex],
    priceEth: figma ? figma.price : priceFor(i),
    previousPriceEth: figma?.previous ?? null,
    description: `Um colecionável digital finalizado à mão da coleção ${COLLECTIONS[imageIndex]}, verificado na ${NETWORK_NAME[network]}, com arte desbloqueável e acesso para colecionadores.`,
    attributes: ATTRIBUTES[imageIndex],
    rating: 3 + (i % 3),
    reviewCount: 4 + ((i * 7) % 30),
    editions: editionsFor(id, i),
    isNew: i < 12,
    trending: i % 3 === 0,
    createdAt: createdAt.toISOString(),
    version: 1,
  }
}

export function createNftFixtures(): Nft[] {
  return Array.from({ length: TOTAL }, (_, i) => buildNft(i))
}
