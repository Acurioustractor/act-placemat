import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const newArt = [
  {
    title: 'Starman',
    artist: 'David Bowie',
    medium: 'Performance portrait',
    inspiration: "I don't know where I'm going from here, but I promise it won't be boring.",
    image: '/images/art/Bowie.jpg',
    aspectRatio: 0.5625,
  },
  {
    title: 'Cave of Quiet Light',
    artist: 'Nick Cave',
    medium: 'Photography & reflection',
    inspiration: 'Stillness and raw emotion that keep us honest.',
    image: '/images/art/Cave.avif',
    aspectRatio: 0.5625,
  },
  {
    title: 'Persistence of Memory',
    artist: 'Salvador Dalí',
    medium: 'Surrealist oil study',
    inspiration: 'Dreamscapes and the fluidity of time.',
    image: '/images/art/Dali.jpeg',
    aspectRatio: 0.7493333333333333,
  },
  {
    title: 'Visionary Thinker',
    artist: 'David Unaipon',
    medium: 'Portrait',
    inspiration: 'First Nations inventor and storyteller—genius already lives here.',
    link: 'https://en.wikipedia.org/wiki/David_Unaipon',
    image: '/images/art/David Unaipon.webp',
    aspectRatio: 1,
  },
  {
    title: 'Abstract Gradient',
    artist: 'Gerhard Richter',
    medium: 'Oil on canvas',
    inspiration: 'Blurring the boundaries between memory and reality.',
    image: '/images/art/Gerhard.webp',
    aspectRatio: 1.134,
  },
  {
    title: 'Palm Island Sovereignty',
    artist: 'Uncle Allan – Palm Island Art',
    medium: 'Acrylic on board',
    inspiration: 'Stories of reef life and cultural sovereignty continue to guide every stroke.',
    link: 'https://burrgumanbarraart.com',
    image: 'https://cdn.prod.website-files.com/689e3bfaae680c28030c9cc1/689e5dfcfa94de9dbc8b5acb_UA_paintings8.jpg',
    aspectRatio: 1.11476,
  },
];

async function run() {
  const year = 2025;
  const { data, error } = await supabase
    .from('review_year_settings')
    .select('settings')
    .eq('year', year)
    .single();

  if (error) {
    throw error;
  }

  const updatedSettings = {
    ...(data?.settings || {}),
    inspiringArt: newArt
  };

  const { error: updateError } = await supabase
    .from('review_year_settings')
    .update({ settings: updatedSettings })
    .eq('year', year);

  if (updateError) {
    throw updateError;
  }

  console.log('Updated inspiringArt for year', year);
}

run()
  .catch((err) => {
    console.error('Failed to update inspiringArt:', err);
    process.exitCode = 1;
  });
