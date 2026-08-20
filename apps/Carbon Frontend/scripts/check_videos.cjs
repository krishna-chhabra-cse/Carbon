const https = require('https');

const candidateList = [
  // Space
  { id: 'e-P5IFTqB98', category: 'Space', title: 'The Largest Black Hole in the Universe' },
  { id: '3pAnRKD4raY', category: 'Space', title: 'The Black Hole That Ate The Universe' },
  { id: 'qEfPBt9dU60', category: 'Space', title: 'What If We Nuke a City?' },
  { id: 'sNhhvQGsMEc', category: 'Space', title: 'The Fermi Paradox — Where Are All The Aliens?' },

  // Universe
  { id: 'uD4izuDMUQA', category: 'Universe', title: 'TIMELAPSE OF THE FUTURE: A Journey to the End of Time' },
  { id: 'h6fcK_fRYaI', category: 'Universe', title: 'The Egg — A Short Story' },
  { id: 'GoW8Tf7hTGA', category: 'Universe', title: 'The True Scale of the Universe' },
  { id: 'dFCbJmgeHmA', category: 'Universe', title: 'What is Something?' },

  // Wildlife
  { id: 'B3OjfK0t1XM', category: 'Wildlife', title: 'Planet Earth II: Racer Snakes vs Marine Iguana' },
  { id: '6v2L2UGZJAM', category: 'Wildlife', title: 'Deep Sea Bioluminescence in 4K' },
  { id: 'JkaxUblCGz0', category: 'Wildlife', title: 'Ants: The Ultimate Superorganisms' },
  { id: '7W33HRc1A6c', category: 'Wildlife', title: 'The Immune System & Cellular Warfare' },

  // Earth
  { id: 'VNGUdObDoLk', category: 'Earth', title: 'Volcanoes 101 | National Geographic' },
  { id: '7GElP4YdrBE', category: 'Earth', title: 'The Deep Ocean Mariana Trench' },
  { id: 'R7p-nPg8t_g', category: 'Earth', title: 'Why Earth is So Special' },
  { id: 'yWO-cvGETRQ', category: 'Earth', title: 'What If We Detonated a Nuclear Bomb Under the Ocean?' }
];

async function checkId(item) {
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${item.id}&format=json`, (res) => {
      resolve({ ...item, status: res.statusCode });
    }).on('error', () => {
      resolve({ ...item, status: 'error' });
    });
  });
}

async function verifyAll() {
  let allPass = true;
  for (const c of candidateList) {
    const res = await checkId(c);
    const pass = res.status === 200;
    if (!pass) allPass = false;
    console.log(`${pass ? '✅' : '❌'} [${res.category}] ${res.id} (${res.status}): ${res.title}`);
  }
  console.log(`\nFinal Verdict: ${allPass ? '🎉 ALL 16 VIDEOS 100% WORKING' : '⚠️ SOME VIDEOS FAILED'}`);
}

verifyAll();
