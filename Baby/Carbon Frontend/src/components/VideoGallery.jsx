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
    id: 'e-P5IFTqB98',
    title: "The Largest Black Hole in the Universe",
    duration: "11 min",
    category: "Space",
    chapters: [
      { title: "1. The Scale of Space", time: 0, description: "Comparing planetary sizes to stellar-mass black holes." },
      { title: "2. Supermassive Monsters", time: 180, description: "How colossal gravitational engines grow at galactic cores." },
      { title: "3. TON 618: The Cosmic Titan", time: 390, description: "A black hole 66 billion times the mass of our Sun." },
      { title: "4. The Ultimate Horizon", time: 540, description: "What happens when light itself cannot escape the boundary." }
    ],
    notes: {
      takeaways: "Black holes represent the most extreme densities in physics, curving spacetime into infinite singularities.",
      points: [
        "TON 618 is wider than our entire solar system combined",
        "Supermassive black holes formed early in the universe's history",
        "They illuminate surrounding matter through blazing accretion discs"
      ]
    }
  },
  {
    id: '3pAnRKD4raY',
    title: "The Black Hole That Ate The Universe",
    duration: "10 min",
    category: "Space",
    chapters: [
      { title: "1. Gravitational Traps", time: 0, description: "How runaway accretion events absorb entire star systems." },
      { title: "2. Spaghettification & Tidal Forces", time: 160, description: "Extreme stretching effects near the event horizon." },
      { title: "3. Quasars & Cosmic Jets", time: 340, description: "Beams of relativistic plasma shooting across intergalactic space." },
      { title: "4. The Era of Eternal Silence", time: 500, description: "The final epoch when only black holes remain." }
    ],
    notes: {
      takeaways: "Gravitational forces near a singularity stretch matter into microscopic strands before consumption.",
      points: [
        "Quasars can outshine entire galaxies containing hundreds of billions of stars",
        "Magnetic fields channel particles into jets traveling near the speed of light",
        "Hawking radiation slowly evaporates all black holes over 10^100 years"
      ]
    }
  },
  {
    id: 'qEfPBt9dU60',
    title: "What If We Nuke a City?",
    duration: "9 min",
    category: "Space",
    chapters: [
      { title: "1. The Initial Flash", time: 0, description: "Thermal radiation and instant ionization of matter." },
      { title: "2. The Shockwave & Blast", time: 140, description: "Supersonic overpressure waves destroying infrastructure." },
      { title: "3. Firestorms & Fallout", time: 310, description: "Convection storms drawing oxygen and distributing radioactive debris." },
      { title: "4. Planetary Consequences", time: 480, description: "Atmospheric particulate blocking sunlight and cooling the planet." }
    ],
    notes: {
      takeaways: "Nuclear physics demonstrates the enormous energy bound within atomic nuclei.",
      points: [
        "Thermal pulses travel at the speed of light, igniting fires instantly",
        "Blast waves cause the majority of direct mechanical destruction",
        "International treaties aim to prevent atmospheric detonations"
      ]
    }
  },
  {
    id: 'sNhhvQGsMEc',
    title: "The Fermi Paradox — Where Are All The Aliens?",
    duration: "11 min",
    category: "Space",
    chapters: [
      { title: "1. The Cosmic Scale", time: 0, description: "Billions of star systems older than our Sun — so where is everybody?" },
      { title: "2. The Great Filter Hypothesis", time: 200, description: "A barrier so insurmountable that almost no intelligence survives." },
      { title: "3. Are We Early or Alone?", time: 410, description: "Evaluating whether humanity has already crossed the filter." },
      { title: "4. Galactic Civilizations", time: 580, description: "Kardashev Scale Type I, II, and III energy civilizations." }
    ],
    notes: {
      takeaways: "The Fermi Paradox highlights the surprising lack of observable extraterrestrial civilizations in an ancient universe.",
      points: [
        "The Great Filter could either be in our evolutionary past or our near future",
        "Megastructures like Dyson Spheres would leave distinct infrared waste heat",
        "Radio silence may suggest intelligent species exist only fleetingly"
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
      { title: "1. The Stelliferous Era", time: 0, description: "The golden age of stars, galaxies, and biological life." },
      { title: "2. The Degenerate Era", time: 480, description: "Dead stars, white dwarfs, and cold iron spheres dominate the cosmos." },
      { title: "3. The Black Hole Era", time: 1020, description: "Black holes become the only remaining celestial bodies in the dark." },
      { title: "4. Heat Death & The Final Silence", time: 1440, description: "Maximum entropy is achieved as the physical universe rests forever." }
    ],
    notes: {
      takeaways: "A sweeping journey across trillions of years tracking the complete evolution and final fate of matter.",
      points: [
        "Star formation will cease in approximately 100 trillion years",
        "Supermassive black holes slowly evaporate via quantum Hawking radiation",
        "Heat death represents the maximum entropy state of the physical cosmos"
      ]
    }
  },
  {
    id: 'h6fcK_fRYaI',
    title: "The Egg — A Short Story",
    duration: "8 min",
    category: "Universe",
    chapters: [
      { title: "1. The Crossing", time: 0, description: "Awakening in the realm between lifetimes." },
      { title: "2. Meeting the Cosmic Guide", time: 130, description: "A dialogue on the purpose and nature of mortal consciousness." },
      { title: "3. One Soul Across Time", time: 280, description: "Discovering that every human who ever lived is the same observer." },
      { title: "4. Hatching the Cosmic Egg", time: 410, description: "Maturing through all human experiences into a universal entity." }
    ],
    notes: {
      takeaways: "An iconic philosophical allegory exploring universal empathy, shared consciousness, and the cosmic continuum.",
      points: [
        "Every act of kindness or cruelty is fundamentally experienced by all",
        "Non-linear time allows infinite simultaneous perspectives",
        "Universal empathy is the ultimate maturation of human consciousness"
      ]
    }
  },
  {
    id: 'GoW8Tf7hTGA',
    title: "The True Scale of the Universe",
    duration: "11 min",
    category: "Universe",
    chapters: [
      { title: "1. From Planck Length to Human Scale", time: 0, description: "Starting at the smallest theoretical length in quantum physics." },
      { title: "2. Planets & Star Systems", time: 190, description: "Comparing the solar system to neighboring star clusters." },
      { title: "3. The Milky Way & Local Group", time: 380, description: "Our galaxy spanning 100,000 light years across." },
      { title: "4. The Observable Cosmic Web", time: 540, description: "Billions of galaxies interconnected in colossal cosmic filaments." }
    ],
    notes: {
      takeaways: "The scale of the universe spans over 60 orders of magnitude from quantum strings to the cosmic horizon.",
      points: [
        "The observable universe is roughly 93 billion light-years in diameter",
        "Galaxies organize into filaments surrounding colossal voids of empty space",
        "Humanity exists precisely in the middle logarithmic range of scale"
      ]
    }
  },
  {
    id: 'dFCbJmgeHmA',
    title: "What is Something? (The Fabric of Reality)",
    duration: "10 min",
    category: "Universe",
    chapters: [
      { title: "1. The Illusion of Solidity", time: 0, description: "Why atoms are 99.999999999% empty space." },
      { title: "2. Quantum Fields", time: 170, description: "Particles as localized vibrations in universal underlying fields." },
      { title: "3. Virtual Particles & Vacuum Energy", time: 360, description: "How empty space constantly bubbles with quantum fluctuations." },
      { title: "4. The Nature of Existence", time: 510, description: "How information and energy form the foundation of reality." }
    ],
    notes: {
      takeaways: "At fundamental quantum levels, physical matter dissolves into vibrating fields and informational states.",
      points: [
        "Solid objects never truly touch — electromagnetic repulsion prevents contact",
        "Quantum electrodynamics describes particles as excitations of underlying fields",
        "The vacuum of space is filled with non-zero baseline energy"
      ]
    }
  },

  // ── WILDLIFE ──
  {
    id: 'B3OjfK0t1XM',
    title: "Planet Earth II: Racer Snakes vs Marine Iguana",
    duration: "5 min",
    category: "Wildlife",
    chapters: [
      { title: "1. The Volcanic Nursery", time: 0, description: "Hatchling marine iguanas emerging on Fernandina Island." },
      { title: "2. The Ambush in the Rocks", time: 75, description: "Dozens of Galápagos racer snakes reacting to movement." },
      { title: "3. The Legendary Escape", time: 150, description: "A heart-stopping chase across razor-sharp volcanic lava." },
      { title: "4. Sanctuary on the Cliffs", time: 230, description: "Reaching safety with the adult colony by the ocean." }
    ],
    notes: {
      takeaways: "One of the most famous natural history sequences ever filmed, showcasing evolutionary agility.",
      points: [
        "Marine iguanas are the only lizard species that forage in the ocean",
        "Racer snakes hunt cooperatively in high numbers during hatching season",
        "High-frame-rate cameras captured the split-second maneuvers in detail"
      ]
    }
  },
  {
    id: '6v2L2UGZJAM',
    title: "Deep Sea Bioluminescence in 4K",
    duration: "10 min",
    category: "Wildlife",
    chapters: [
      { title: "1. The Midnight Zone", time: 0, description: "Descending 1,000 meters beneath the surface into perpetual darkness." },
      { title: "2. Living Cold Light", time: 160, description: "Luciferin reactions producing zero-heat chemical illumination." },
      { title: "3. Siphonophores & Comb Jellies", time: 340, description: "Colonial organisms pulsing rainbow diffraction patterns." },
      { title: "4. Camouflage & Counter-Illumination", time: 490, description: "Using light to blend in with the faint surface water above." }
    ],
    notes: {
      takeaways: "Over 75% of deep-sea creatures produce their own light for hunting, mating, and camouflage.",
      points: [
        "Bioluminescence is the most common form of communication on Earth",
        "Creatures produce specialized lenses and reflectors to focus light beams",
        "Deep-sea ecosystems thrive under thousands of pounds of hydrostatic pressure"
      ]
    }
  },
  {
    id: 'JkaxUblCGz0',
    title: "Ants: The Ultimate Superorganisms",
    duration: "11 min",
    category: "Wildlife",
    chapters: [
      { title: "1. The Colony Mind", time: 0, description: "How decentralized chemical trails produce emergent intelligence." },
      { title: "2. Specialized Castes", time: 180, description: "Soldiers, foragers, and nursery workers operating in harmony." },
      { title: "3. Global Argentine Ant Mega-Colonies", time: 370, description: "A single supercolony spanning thousands of miles across continents." },
      { title: "4. Agriculture & Architecture", time: 530, description: "Leafcutters cultivating fungal gardens with climate-controlled ventilation." }
    ],
    notes: {
      takeaways: "Ant colonies function as unified superorganisms, accomplishing architectural feats through collective action.",
      points: [
        "Ants comprise roughly 20% of all terrestrial animal biomass on Earth",
        "Argentine ants form global supercolonies where members never fight each other",
        "Leafcutter ants practiced agriculture 50 million years before humans"
      ]
    }
  },
  {
    id: '7W33HRc1A6c',
    title: "The Immune System & Cellular Warfare",
    duration: "11 min",
    category: "Wildlife",
    chapters: [
      { title: "1. The Microscopic Battlefield", time: 0, description: "Viruses and bacteria invading cellular boundaries." },
      { title: "2. Macrophages & Neutrophils", time: 170, description: "The frontline devourers hunting and dissolving intruders." },
      { title: "3. Dendritic Cells & The Alarm", time: 350, description: "Carrying antigen blueprints to the lymph node command centers." },
      { title: "4. T-Cells & Targeted Weaponry", time: 520, description: "Deploying custom molecular keys to neutralize pathogens." }
    ],
    notes: {
      takeaways: "The biological immune system is a complex decentralized army defending living organisms 24/7.",
      points: [
        "Trillions of immune cells coordinate without any centralized brain",
        "Memory B-cells retain defenses for decades against repeat infections",
        "Complement proteins puncture bacterial walls within milliseconds"
      ]
    }
  },

  // ── EARTH ──
  {
    id: 'VNGUdObDoLk',
    title: "Volcanoes 101 | National Geographic",
    duration: "5 min",
    category: "Earth",
    chapters: [
      { title: "1. Plate Tectonic Engines", time: 0, description: "How subduction zones and mantle plumes generate magma." },
      { title: "2. Shield vs Stratovolcanoes", time: 80, description: "Effusive basalt flows versus explosive pyroclastic eruptions." },
      { title: "3. The Pacific Ring of Fire", time: 160, description: "The horse-shoe rim containing 75% of Earth's active volcanoes." },
      { title: "4. Planetary Renewal", time: 240, description: "How volcanic minerals create fertile soils across continents." }
    ],
    notes: {
      takeaways: "Volcanoes act as planetary thermal pressure valves, recycling deep crustal minerals into the biosphere.",
      points: [
        "Over 1,500 active volcanoes exist across terrestrial Earth",
        "Pyroclastic flows can reach speeds of 700 km/h with 1,000°C temperatures",
        "Volcanic degassing was essential in creating Earth's original atmosphere"
      ]
    }
  },
  {
    id: '7GElP4YdrBE',
    title: "The Deep Ocean Mariana Trench",
    duration: "11 min",
    category: "Earth",
    chapters: [
      { title: "1. Subduction at the Trench", time: 0, description: "The Pacific tectonic plate sinking beneath the Mariana Plate." },
      { title: "2. Challenger Deep: 11,000m Down", time: 190, description: "Reaching the lowest point on the surface of planet Earth." },
      { title: "3. Life Under Extreme Hydrostatic Pressure", time: 380, description: "Snailfish and amphipods thriving in total darkness." },
      { title: "4. The Abyssal Frontier", time: 540, description: "Why we know more about the surface of Mars than our deep oceans." }
    ],
    notes: {
      takeaways: "The Mariana Trench reaches depths of nearly 11 kilometers, with water pressures exceeding 1,000 atmospheres.",
      points: [
        "Challenger Deep is deeper than Mount Everest is tall",
        "Creatures produce piezolyte proteins that prevent cell membranes from freezing under pressure",
        "Hydrothermal vents support chemosynthetic ecosystems independent of sunlight"
      ]
    }
  },
  {
    id: 'R7p-nPg8t_g',
    title: "Why Earth is So Special (Goldilocks Zone)",
    duration: "10 min",
    category: "Earth",
    chapters: [
      { title: "1. The Habitable Zone", time: 0, description: "The precise distance from the Sun allowing liquid water to pool." },
      { title: "2. The Molten Dynamo Core", time: 160, description: "Liquid iron generating the magnetosphere that protects our air." },
      { title: "3. The Stabilizing Moon", time: 330, description: "How our large satellite locks Earth's axial tilt and seasonal stability." },
      { title: "4. The Carbon Cycle & Biosphere", time: 500, description: "Living systems actively regulating atmospheric temperatures." }
    ],
    notes: {
      takeaways: "Earth's unique confluence of magnetic shield, liquid water, large moon, and active tectonics created an enduring oasis.",
      points: [
        "The magnetosphere deflects high-energy solar storms into beautiful auroras",
        "Plate tectonics acts as a natural carbon recycling mechanism",
        "The Moon prevents chaotic wobbles in Earth's axial tilt"
      ]
    }
  },
  {
    id: 'yWO-cvGETRQ',
    title: "What If We Detonated a Nuclear Bomb Under the Ocean?",
    duration: "9 min",
    category: "Earth",
    chapters: [
      { title: "1. Hydrodynamic Blast", time: 0, description: "Water resistance containing the expanding vapor bubble." },
      { title: "2. The Superheated Gas Cavity", time: 140, description: "The bubble oscillating and collapsing under extreme hydrostatic pressure." },
      { title: "3. Underwater Shockwaves", time: 310, description: "Sound and pressure waves traveling for thousands of kilometers through water." },
      { title: "4. Oceanic Aftermath", time: 470, description: "Examining why the ocean easily absorbs the energy with localized effects." }
    ],
    notes: {
      takeaways: "The immense density and pressure of the deep ocean dampens surface effects of high-energy detonations.",
      points: [
        "Water is nearly incompressible, reflecting shockwaves with high kinetic transfer",
        "Deep-water cavitation creates rapid compression-expansion oscillations",
        "Marine ecosystems absorb and dilute dissolved radiation across massive volumes"
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
                src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} 
                alt={video.title} 
                className="video-thumb-img" 
                loading="lazy"
                onError={(e) => {
                  if (!e.target.src.includes('mqdefault')) {
                    e.target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                  }
                }}
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
