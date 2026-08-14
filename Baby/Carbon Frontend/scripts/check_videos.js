const https = require('https');

const candidates = [
  { id: 'e-P5IFTqB98', title: 'The Largest Black Hole in the Universe' },
  { id: 'o6jAou_qH8A', title: 'What If We Detonated All Nuclear Bombs at Once?' },
  { id: 'sNhhvQGsMEc', title: 'The Fermi Paradox — Where Are All The Aliens?' },
  { id: 'uD4izuDMUQA', title: 'TIMELAPSE OF THE FUTURE' },
  { id: 'h6fcK_fRYaI', title: 'The Egg — A Short Story' },
  { id: 'ZL4yYHdDSWs', title: 'The Fermi Paradox II' },
  { id: 'EEIk7gwjgIM', title: 'Earth from Space — NASA ISS 4K' },
  { id: 'VNGUdObDoLk', title: 'Volcanoes 101 | National Geographic' },
  { id: '1MIKE28mN8g', title: 'Northern Lights 4K Real Time' },
  { id: 'B3OjfK0t1XM', title: 'Planet Earth II — Iguana vs Snakes' },
  { id: '6v2L2UGZJAM', title: 'Deep Ocean Creatures in 4K' },
  { id: '4pmT6bl_7iI', title: 'James Webb Space Telescope Discoveries' },
  { id: 'Y2tm40uMhDI', title: 'Secrets of the Deep Ocean' },
  { id: 'bY0uT9n4Z7g', title: 'Life in the Universe' },
  { id: 'wNf9r7z_290', title: 'Snow Leopard on the Cliff' },
  { id: '3w58Z-E_K0s', title: 'Earth View' },
  { id: '1laU9W36KzI', title: 'Blue Planet' }
];

async function checkId(item) {
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${item.id}&format=json`, (res) => {
      resolve({ id: item.id, title: item.title, status: res.statusCode });
    }).on('error', () => {
      resolve({ id: item.id, title: item.title, status: 'error' });
    });
  });
}

async function run() {
  console.log('Testing candidates...');
  for (const c of candidates) {
    const res = await checkId(c);
    console.log(`${res.status === 200 ? '✅' : '❌'} ${res.id} (${res.status}): ${res.title}`);
  }
}

run();
