import type { RedevelopmentSite } from '../types/yearInReview'

export const DEFAULT_REDEVELOPMENT_SITES: RedevelopmentSite[] = [
  {
    id: 'townsville',
    location: 'Townsville',
    traditionalName: 'Gurambilbarra',
    region: 'North Queensland',
    projectSlug: 'townsville-redevelopment',
    description:
      'Working with Traditional Owners and local partners to transform underutilized urban land into thriving community spaces. This project combines cultural landscape design with sustainable building practices to create places that honor Country while meeting community needs.',
    partner: {
      name: 'Bindal & Wulgurukaba Traditional Owners',
      description:
        'The Traditional Owners of Gurambilbarra Country, guiding the cultural design and governance of redevelopment projects.'
    },
    stats: [
      { value: '2.4ha', label: 'Land Transformed' },
      { value: '12', label: 'Community Spaces' },
      { value: '45', label: 'Local Jobs' },
      { value: '8', label: 'Native Species Restored' }
    ],
    accentColor: '#59c3c3',
    beforeImage: undefined,
    afterImage: undefined,
    droneImage: undefined
  },
  {
    id: 'sydney',
    location: 'Sydney',
    traditionalName: 'Warrang',
    region: 'New South Wales',
    projectSlug: 'sydney-urban-renewal',
    description:
      'Inner-city renewal that puts community housing, green space, and social infrastructure at its heart. Partnering with Aboriginal Land Councils and housing providers to ensure this development creates lasting benefit for those who need it most.',
    partner: {
      name: 'Metropolitan Local Aboriginal Land Council',
      description:
        'Working together to ensure Aboriginal community benefit and cultural recognition in urban development.'
    },
    stats: [
      { value: '1.8ha', label: 'Site Area' },
      { value: '120', label: 'Affordable Homes' },
      { value: '3', label: 'Community Buildings' },
      { value: '60%', label: 'Green Space' }
    ],
    accentColor: '#ffa857',
    beforeImage: undefined,
    afterImage: undefined,
    droneImage: undefined
  },
  {
    id: 'alice-springs',
    location: 'Alice Springs',
    traditionalName: 'Mparntwe',
    region: 'Northern Territory',
    projectSlug: 'alice-springs-regeneration',
    description:
      'Desert-adapted regeneration that responds to the unique challenges and opportunities of Central Australia. This project brings together remote community expertise with innovative design to create resilient, culturally grounded infrastructure.',
    partner: {
      name: 'Lhere Artepe Aboriginal Corporation',
      description:
        'The native title holders for Mparntwe, leading the vision for culturally appropriate development on their Country.'
    },
    stats: [
      { value: '5.2ha', label: 'Land Activated' },
      { value: '18', label: 'Bush Foods Planted' },
      { value: '28', label: 'Training Positions' },
      { value: '4', label: 'Cultural Sites Protected' }
    ],
    accentColor: '#f7a399',
    beforeImage: undefined,
    afterImage: undefined,
    droneImage: undefined
  }
];

export function cloneRedevelopmentSites(source: RedevelopmentSite[] = DEFAULT_REDEVELOPMENT_SITES) {
  return source.map(site => ({
    ...site,
    partner: {
      ...site.partner
    },
    stats: site.stats ? site.stats.map(stat => ({ ...stat })) : []
  }));
}
