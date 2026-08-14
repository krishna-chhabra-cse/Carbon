import { useState, useEffect } from 'react';
import { Play, Clock, Sparkles, Star, Film, Layers } from 'lucide-react';

const SPACE_FACTS = [
  "💫 A neutron star is so dense that a teaspoon of it would weigh about 6 billion tons.",
  "🪐 Saturn's rings are made mostly of ice particles, with some rocky debris and dust.",
  "🌍 Earth's core is as hot as the surface of the Sun — about 5,500°C.",
  "🚀 Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
  "🌌 There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "☀️ The Sun makes up 99.86% of all mass in our solar system.",
  "🔭 The Hubble Space Telescope has made over 1.5 million observations since 1990.",
  "🌙 The Moon is drifting away from Earth at about 3.8 centimeters per year.",
  "⭐ Betelgeuse, a red supergiant star, is so large it could swallow our entire solar system.",
  "🛸 Voyager 1, launched in 1977, is the farthest human-made object from Earth.",
  "🌊 Europa, Jupiter's moon, may have more water than all of Earth's oceans combined.",
  "💎 It rains diamonds on Neptune and Uranus due to extreme atmospheric pressure.",
  "🔥 Venus is the hottest planet in our solar system, even though Mercury is closer to the Sun.",
  "🧊 The coldest known place in the universe is the Boomerang Nebula at -272°C.",
  "📡 The first radio signal sent to space was in 1974 from the Arecibo Observatory.",
  "🌀 A day on Venus is longer than a year on Venus — it takes 243 Earth days to rotate.",
  "🪨 The largest known asteroid, Ceres, is about 940 km in diameter.",
  "🛰️ The ISS orbits Earth roughly every 90 minutes, seeing 16 sunrises per day.",
  "✨ When you look at the night sky, you're seeing stars as they were years or centuries ago.",
  "🌈 Sunsets on Mars appear blue because of fine dust particles in the Martian atmosphere."
];

export const VIDEOS = [
  // ── SPACE ──
  {
    id: 'libKVRa074Q',
    title: "The Largest Black Hole in the Universe",
    duration: "11 min",
    category: "Space",
    chapters: [
      { title: "1. What is the Event Horizon?", time: 0, description: "Understanding the boundary where gravity prevents anything from escaping." },
      { title: "2. Stellar vs Supermassive Black Holes", time: 180, description: "How collapsed stars compare to the colossal engines at galactic centers." },
      { title: "3. TON 618: The Ultimate Behemoth", time: 390, description: "A black hole so massive it holds 66 billion times the mass of our Sun." },
      { title: "4. The Fate of Black Holes", time: 540, description: "How Hawking radiation will slowly evaporate black holes over trillions of years." }
    ],
    notes: {
      takeaways: "Black holes are the most extreme gravitational objects in the universe, curving spacetime to infinity.",
      points: [
        "Stellar black holes form when giant stars collapse at the end of their lifecycle",
        "Supermassive black holes anchor almost every galaxy, including the Milky Way",
        "TON 618 is one of the largest structures ever discovered in cosmology"
      ]
    }
  },
  {
    id: 'udFxKZRy9fU',
    title: "What If We Nuke The Moon?",
    duration: "9 min",
    category: "Space",
    chapters: [
      { title: "1. Physics of Lunar Explosions", time: 0, description: "Why nuclear detonations in vacuum lack shockwaves and firestorms." },
      { title: "2. Crater Formation & Ejecta", time: 150, description: "High-speed debris hurled into orbit and towards Earth." },
      { title: "3. Effect on Earth's Tides", time: 320, description: "Examining if a nuclear strike could perturb the lunar orbital velocity." },
      { title: "4. The Final Verdict", time: 460, description: "Why the Moon would remain largely unharmed despite the dramatic explosion." }
    ],
    notes: {
      takeaways: "Without an atmosphere, nuclear explosions produce bright radiation flash and cratering, but no shockwaves.",
      points: [
        "No air means no acoustic shockwave or mushroom cloud",
        "The Moon's mass is far too huge to be shifted by human weapons",
        "Debris could create a temporary meteor storm in Earth's atmosphere"
      ]
    }
  },
  {
    id: 'sNhhvQGsMEc',
    title: "The Last Human on Mars",
    duration: "10 min",
    category: "Space",
    chapters: [
      { title: "1. The Red Horizon", time: 0, description: "The silent and desolate landscape of human settlement on Mars." },
      { title: "2. Life Inside the Biodome", time: 160, description: "Recycling oxygen, harvesting subsurface ice, and growing crops." },
      { title: "3. Facing Martian Dust Storms", time: 340, description: "Planet-wide dust storms blocking solar power for months." },
      { title: "4. The Long Journey Forward", time: 510, description: "What the future holds for interplanetary civilization." }
    ],
    notes: {
      takeaways: "Colonizing Mars requires closed-loop ecological life support and protection from high cosmic radiation.",
      points: [
        "Atmospheric pressure on Mars is less than 1% of Earth's",
        "Subsurface regolith provides natural radiation shielding",
        "Terraforming requires centuries of artificial atmosphere thickening"
      ]
    }
  },
  {
    id: 'h3GZ05G5kQY',
    title: "Hubble Space Telescope Tour",
    duration: "13 min",
    category: "Space",
    chapters: [
      { title: "1. Launch of the Great Observatory", time: 0, description: "Deploying Hubble above the turbulent distortions of Earth's atmosphere." },
      { title: "2. The Pillars of Creation", time: 210, description: "Peer into stellar nurseries where new solar systems are born." },
      { title: "3. Deep Field Galaxies", time: 420, description: "Looking back 13 billion years into the infancy of the cosmic web." },
      { title: "4. Legacy & The Next Generation", time: 630, description: "How Hubble paved the way for the James Webb Space Telescope." }
    ],
    notes: {
      takeaways: "Hubble revolutionized human understanding of the universe with over 1.5 million observations.",
      points: [
        "Pinpointed the age of the universe to ~13.8 billion years",
        "Confirmed that supermassive black holes exist at galactic cores",
        "Operates in low Earth orbit at ~540 kilometers altitude"
      ]
    }
  },

  // ── UNIVERSE ──
  {
    id: 'uD4izuDMUQA',
    title: "TIMELAPSE OF THE FUTURE",
    duration: "29 min",
    category: "Universe",
    chapters: [
      { title: "1. The Stelliferous Era", time: 0, description: "The golden age of stars, galaxies, and burgeoning life across the universe." },
      { title: "2. The Degenerate Era", time: 480, description: "Dead stars, white dwarfs, and black holes dominate the cooling cosmos." },
      { title: "3. The Black Hole Era", time: 1020, description: "Black holes become the only remaining celestial structures in deep space." },
      { title: "4. Heat Death & The Dark Era", time: 1440, description: "Entropy reaches maximum and the universe enters eternal quietness." }
    ],
    notes: {
      takeaways: "A sweeping cosmological journey across billions of years to the ultimate end of all matter.",
      points: [
        "Stars will cease forming within approximately 100 trillion years",
        "Supermassive black holes slowly evaporate via quantum Hawking radiation",
        "Heat death represents the maximum entropy state of the physical universe"
      ]
    }
  },
  {
    id: 'ZL4yYHdDSWs',
    title: "Where Are All The Aliens? (Fermi Paradox)",
    duration: "11 min",
    category: "Universe",
    chapters: [
      { title: "1. The Scale of the Cosmos", time: 0, description: "Billions of star systems older than our Sun — so where is everyone?" },
      { title: "2. The Great Filter Concept", time: 200, description: "A barrier so difficult that almost no species survives it." },
      { title: "3. Are We First or Alone?", time: 410, description: "Evaluating whether humanity has already passed the Great Filter." },
      { title: "4. Kardashev Scale Civilizations", time: 580, description: "Type I, II, and III civilizations harnessing planetary and galactic energy." }
    ],
    notes: {
      takeaways: "The Fermi Paradox asks why we haven't seen signs of alien civilizations despite the universe's vastness.",
      points: [
        "The Great Filter could either be behind us (origin of life) or ahead of us (self-destruction)",
        "Dyson spheres would leave unmistakable infrared thermal signatures",
        "Radio silence may indicate intelligent life is exceedingly rare or brief"
      ]
    }
  },
  {
    id: 'P5_Msrdg3Hk',
    title: "All Nuclear Bombs Detonated At Once",
    duration: "11 min",
    category: "Universe",
    chapters: [
      { title: "1. Global Arsenal Assessment", time: 0, description: "Calculating the total yield of ~15,000 nuclear warheads on Earth." },
      { title: "2. Ground Zero & The Firestorm", time: 190, description: "A fireball 50 kilometers wide destroying the surrounding region." },
      { title: "3. Atmospheric Fallout & Winter", time: 420, description: "Soot injected into the stratosphere blocking sunlight for years." },
      { title: "4. Biosphere Rebound", time: 560, description: "How life slowly recovers across geological timescales." }
    ],
    notes: {
      takeaways: "Simultaneous nuclear explosion would catastrophically impact Earth's climate and ecosystems.",
      points: [
        "Thermal radiation causes widespread wildfires and particulate clouds",
        "Stratospheric soot produces global cooling and agricultural failure",
        "Planetary recovery takes thousands to millions of years"
      ]
    }
  },
  {
    id: 'Iy7NzjCmUf0',
    title: "The Egg — A Cosmic Perspective",
    duration: "8 min",
    category: "Universe",
    chapters: [
      { title: "1. The Crossing", time: 0, description: "Awakening in the realm between lifetimes." },
      { title: "2. Meeting the Cosmic Guide", time: 130, description: "A dialogue on the purpose of mortal existence." },
      { title: "3. One Consciousness Across Time", time: 280, description: "Discovering that every human who ever lived is the same soul." },
      { title: "4. Hatching the Cosmic Egg", time: 410, description: "Growing through every possible experience to become a universal being." }
    ],
    notes: {
      takeaways: "A philosophical animation exploring empathy, interconnectedness, and universal consciousness.",
      points: [
        "Every act of kindness or cruelty is fundamentally done unto oneself",
        "Non-linear time allows infinite simultaneous perspectives",
        "Universal empathy is the ultimate maturation of awareness"
      ]
    }
  },

  // ── WILDLIFE ──
  {
    id: 'V3pdpzEae4k',
    title: "Seven Worlds, One Planet",
    duration: "8 min",
    category: "Wildlife",
    chapters: [
      { title: "1. Antarctica & The Polar Seas", time: 0, description: "Surviving the coldest, windiest continent on Earth." },
      { title: "2. Asia — The Land of Extremes", time: 140, description: "From frozen Siberian forests to tropical Indonesian jungles." },
      { title: "3. South America — Canopy Wonders", time: 290, description: "The richest biodiversity hotspot on the globe." },
      { title: "4. Africa — Great Migrations", time: 410, description: "Dramatic predator-prey dynamics across the open savannas." }
    ],
    notes: {
      takeaways: "Millions of years of continental drift shaped the unique wildlife ecosystems across all seven continents.",
      points: [
        "Geographic isolation drives unique evolutionary adaptations",
        "Predators and prey maintain delicate environmental equilibrium",
        "Protecting global wildlife corridors preserves biodiversity"
      ]
    }
  },
  {
    id: 'f7jVk2F5u0M',
    title: "Planet Earth II — Wildlife Spectacles",
    duration: "5 min",
    category: "Wildlife",
    chapters: [
      { title: "1. Island Survival", time: 0, description: "Marine iguanas and racer snakes in a legendary chase." },
      { title: "2. Mountain Predators", time: 80, description: "Snow leopards navigating treacherous Himalayan cliffs." },
      { title: "3. Jungle Ecosystems", time: 160, description: "Courtship dances and canopy competition in dense rainforests." },
      { title: "4. Urban Adapters", time: 240, description: "Leopards and monkeys thriving inside modern cities." }
    ],
    notes: {
      takeaways: "High-definition cinematography capturing rare and breathtaking animal behaviors worldwide.",
      points: [
        "Animals show remarkable ingenuity adapting to extreme terrains",
        "Urban environments create new ecological niches",
        "Preserving habitats is vital for endangered predator populations"
      ]
    }
  },
  {
    id: 'r9PeYPHdpNo',
    title: "Deep Sea Wonders & Marine Life",
    duration: "10 min",
    category: "Wildlife",
    chapters: [
      { title: "1. The Twilight Zone", time: 0, description: "Faint sunlight filtering through the ocean depths." },
      { title: "2. Living Lights (Bioluminescence)", time: 170, description: "Glowing creatures using light to hunt, hide, and communicate." },
      { title: "3. Hydrothermal Vent Oases", time: 360, description: "Chemosynthetic ecosystems thriving in superheated, sunless water." },
      { title: "4. The Abyssal Plains", time: 510, description: "Strange and magnificent deep-sea predators surviving extreme pressure." }
    ],
    notes: {
      takeaways: "Over 80% of the ocean remains unmapped and unexplored, home to bizarre and resilient life forms.",
      points: [
        "Creatures survive crushing pressures exceeding 1,000 atmospheres",
        "Chemosynthesis sustains life independent of solar energy",
        "Bioluminescence provides camouflage against predators from below"
      ]
    }
  },
  {
    id: 'p1mGImE4b98',
    title: "Dynasties: Greatest Wildlife Stories",
    duration: "6 min",
    category: "Wildlife",
    chapters: [
      { title: "1. Primate Leadership", time: 0, description: "Chimpanzee troop politics and territorial defense." },
      { title: "2. Polar Endurance", time: 100, description: "Emperor penguins huddling together through Antarctic winters." },
      { title: "3. Lion Pride Sovereignty", time: 200, description: "A lioness defending her cubs against rival prides." },
      { title: "4. Painted Wolf Packs", time: 300, description: "Cooperative hunting tactics across the African floodplains." }
    ],
    notes: {
      takeaways: "Follows families of animals fighting for the survival of their bloodlines against all odds.",
      points: [
        "Social bonding and family cooperation are crucial for apex survival",
        "Maternal investment ensures the continuation of fragile species",
        "Landscape fragmentation challenges traditional migration routes"
      ]
    }
  },

  // ── EARTH ──
  {
    id: '3w58Z-E_K0s',
    title: "Earth from Space — 4K Ultra HD Views",
    duration: "15 min",
    category: "Earth",
    chapters: [
      { title: "1. Day & Night Terminators", time: 0, description: "The graceful boundary between sunrise and sunset viewed from orbit." },
      { title: "2. Auroras from Above", time: 250, description: "Curtains of green and purple light dancing over polar icecaps." },
      { title: "3. Oceanic Storms & Cyclones", time: 500, description: "Gigantic atmospheric spirals forming over warm ocean currents." },
      { title: "4. City Lights Across Continents", time: 750, description: "Human civilization glowing like constellations across the night side." }
    ],
    notes: {
      takeaways: "Viewing Earth from orbit reveals a fragile, boundary-less oasis floating in cosmic stillness.",
      points: [
        "The ISS travels at 28,000 km/h, completing an orbit every 90 minutes",
        "Earth's atmosphere is a razor-thin protective veil against the void",
        "The Overview Effect fundamentally shifts astronauts' perspective on unity"
      ]
    }
  },
  {
    id: 'f4s9p-ZkZ6U',
    title: "Volcanoes 101",
    duration: "5 min",
    category: "Earth",
    chapters: [
      { title: "1. Plate Tectonic Engines", time: 0, description: "How subduction zones and hot spots generate magma beneath Earth's crust." },
      { title: "2. Shield vs Stratovolcanoes", time: 80, description: "Effusive basalt flows versus explosive pyroclastic eruptions." },
      { title: "3. The Ring of Fire", time: 160, description: "The Pacific rim horse-shoe containing 75% of Earth's active volcanoes." },
      { title: "4. Planetary Renewal", time: 240, description: "How volcanic ash creates some of the most fertile soils on the planet." }
    ],
    notes: {
      takeaways: "Volcanoes are the cooling valves of Earth, cycling mineral nutrients and renewing the planetary surface.",
      points: [
        "Over 1,500 active volcanoes exist across terrestrial Earth",
        "Pyroclastic flows can exceed speeds of 700 km/h with 1,000°C heat",
        "Volcanic degassing helped build Earth's early atmosphere and oceans"
      ]
    }
  },
  {
    id: '7Mv6iJ6XjOQ',
    title: "Aurora Borealis in Real Time",
    duration: "5 min",
    category: "Earth",
    chapters: [
      { title: "1. Solar Wind Collisions", time: 0, description: "Charged solar particles streaming across 150 million kilometers to Earth." },
      { title: "2. The Magnetic Shield", time: 80, description: "Earth's magnetosphere funneling ions towards the polar regions." },
      { title: "3. Chemistry of Celestial Colors", time: 160, description: "Excited oxygen producing green and red; nitrogen glowing purple." },
      { title: "4. The Northern Lights Spectacle", time: 240, description: "Real-time 4K footage of dancing ribbon auroras in Norway." }
    ],
    notes: {
      takeaways: "Auroras are visual proof of Earth's magnetic field protecting our atmosphere from the solar wind.",
      points: [
        "Green auroras occur around 100 km altitude when oxygen is excited",
        "Red auroras occur at higher altitudes above 200 km",
        "Solar maximums generate intense geomagnetic storm events"
      ]
    }
  },
  {
    id: '1laU9W36KzI',
    title: "Blue Planet II: Ocean Secrets",
    duration: "6 min",
    category: "Earth",
    chapters: [
      { title: "1. Coral Metropolis", time: 0, description: "Microscopic polyps building structures visible from space." },
      { title: "2. The Kelp Underwater Forest", time: 90, description: "Rapidly growing kelp providing sanctuary and capturing carbon." },
      { title: "3. Open Ocean Migrators", time: 190, description: "Whales and sea turtles journeying across vast ocean basins." },
      { title: "4. The Blue Heart of Earth", time: 280, description: "Why healthy oceans are essential for regulating global climate." }
    ],
    notes: {
      takeaways: "The global ocean covers 71% of Earth's surface and produces over half the oxygen we breathe.",
      points: [
        "Coral reefs support 25% of all marine species despite covering <1% of the ocean floor",
        "Oceans absorb over 90% of excess heat trapped by greenhouse gases",
        "Phytoplankton in the ocean generate more oxygen than all rainforests combined"
      ]
    }
  }
];

export default function VideoGallery({ onPlayVideo }) {
  const [spaceFact, setSpaceFact] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const pick = () => setSpaceFact(SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)]);
    pick();
    const interval = setInterval(pick, 15000);
    return () => clearInterval(interval);
  }, []);

  const filters = ['All', 'Space', 'Universe', 'Wildlife', 'Earth'];
  const filteredVideos = activeFilter === 'All' ? VIDEOS : VIDEOS.filter(v => v.category === activeFilter);

  return (
    <div className="video-gallery-view animate-fade-in">
      <div className="section-header-cosmic">
        <div className="header-badge">
          <Film size={14} color="#38bdf8" />
          <span>Curated for you</span>
        </div>
        <h2>EXPLORE</h2>
        <p>
          Watch fascinating videos about space, the universe, wildlife, and the world around us.
        </p>
      </div>

      <div className="space-fact-banner">
        <Star size={16} className="fact-star-icon" />
        <span className="fact-text">{spaceFact}</span>
      </div>

      <div className="gallery-filters">
        {filters.map(filter => (
          <button
            key={filter}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="video-grid">
        {filteredVideos.map(video => (
          <div 
            key={video.id} 
            className="video-card"
            onClick={() => onPlayVideo({ 
              title: video.title, 
              subtitle: `${video.category} • ${video.duration}`,
              videoUrl: `https://www.youtube.com/embed/${video.id}`,
              chapters: video.chapters,
              notes: video.notes
            })}
          >
            <div className="video-thumbnail">
              <img 
                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`} 
                alt={video.title} 
                className="video-thumb-img" 
                loading="lazy"
              />
              <div className="video-play-overlay">
                <div className="play-circle">
                  <Play size={24} color="#05070f" fill="#05070f" />
                </div>
              </div>
            </div>
            <div className="video-card-body">
              <div className="video-category-tag">{video.category}</div>
              <h3 className="video-card-title">{video.title}</h3>
              <div className="video-card-meta">
                <span><Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> {video.duration}</span>
                <span>•</span>
                <span><Layers size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> {video.chapters?.length || 4} Chapters</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
