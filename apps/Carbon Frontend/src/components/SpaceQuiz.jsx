import { useState } from 'react';
import { Sparkles, Trophy, RotateCcw, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

const ALL_QUESTIONS = [
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
  { question: "What is the closest star to Earth?", options: ["Sirius", "Alpha Centauri", "The Sun", "Betelgeuse"], correct: 2 },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1 },
  { question: "What galaxy do we live in?", options: ["Andromeda", "Milky Way", "Triangulum", "Sombrero"], correct: 1 },
  { question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1 },
  { question: "What is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correct: 1 },
  { question: "What is a light-year?", options: ["Unit of time", "Unit of distance", "Unit of speed", "Unit of brightness"], correct: 1 },
  { question: "Which planet is famous for its rings?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1 },
  { question: "What causes a solar eclipse?", options: ["Moon blocks the Sun", "Earth blocks the Sun", "Sun shrinks", "Clouds cover the Sun"], correct: 0 },
  { question: "How old is the universe approximately?", options: ["4.5 billion years", "10 billion years", "13.8 billion years", "20 billion years"], correct: 2 },
  { question: "What is the largest planet in our solar system?", options: ["Saturn", "Jupiter", "Neptune", "Uranus"], correct: 1 },
  { question: "What do astronauts experience in orbit?", options: ["Zero gravity", "Microgravity", "Double gravity", "No effect"], correct: 1 },
  { question: "What element does the Sun primarily burn?", options: ["Helium", "Oxygen", "Hydrogen", "Carbon"], correct: 2 },
  { question: "Which space agency landed humans on the Moon?", options: ["ESA", "NASA", "ISRO", "Roscosmos"], correct: 1 },
  { question: "What is the smallest planet in our solar system?", options: ["Mars", "Mercury", "Venus", "Pluto"], correct: 1 },
  { question: "What holds galaxies together?", options: ["Magnetism", "Gravity", "Dark energy", "Light"], correct: 1 },
  { question: "How long does it take sunlight to reach Earth?", options: ["1 minute", "8 minutes", "30 minutes", "1 hour"], correct: 1 },
  { question: "What is a supernova?", options: ["A comet", "An exploding star", "A black hole", "A galaxy"], correct: 1 },
  { question: "Which planet rotates on its side?", options: ["Neptune", "Saturn", "Mars", "Uranus"], correct: 3 },
  { question: "What is the Milky Way?", options: ["A star", "A planet", "A galaxy", "A nebula"], correct: 2 },
  { question: "What year did humans first walk on the Moon?", options: ["1965", "1969", "1972", "1975"], correct: 1 },
  { question: "What is the ISS?", options: ["A rocket", "A space station", "A satellite", "A telescope"], correct: 1 },
  { question: "Which planet has the Great Red Spot?", options: ["Mars", "Saturn", "Jupiter", "Neptune"], correct: 2 },
  { question: "What is a constellation?", options: ["A group of stars forming a pattern", "A type of planet", "A space rock", "A galaxy cluster"], correct: 0 },
  { question: "What protects Earth from solar radiation?", options: ["The Moon", "The atmosphere and magnetic field", "Jupiter", "The ozone layer only"], correct: 1 }
];

export default function SpaceQuiz() {
  const [quizState, setQuizState] = useState('start'); // start, active, result
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const startQuiz = () => {
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsChecking(false);
    setQuizState('active');
  };

  const handleOptionClick = (index) => {
    if (isChecking) return;
    setSelectedOption(index);
    setIsChecking(true);
    
    if (index === questions[currentIndex].correct) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setSelectedOption(null);
        setIsChecking(false);
      } else {
        const finalScore = score + (index === questions[currentIndex].correct ? 1 : 0);
        const percentage = Math.round((finalScore / questions.length) * 100);
        try {
          const prev = JSON.parse(localStorage.getItem('carbon_space_quiz_score') || '{"completed":0,"highestScore":0,"lastScore":0}');
          const updated = {
            completed: (prev.completed || 0) + 1,
            highestScore: Math.max(prev.highestScore || 0, percentage),
            lastScore: percentage
          };
          localStorage.setItem('carbon_space_quiz_score', JSON.stringify(updated));
        } catch (e) {
          console.warn('Quiz score persistence:', e);
        }
        setQuizState('result');
      }
    }, 1500);
  };

  const getScoreMessage = () => {
    if (score <= 3) return "Keep exploring! 🌍";
    if (score <= 6) return "Not bad, space cadet! 🚀";
    if (score <= 9) return "Impressive knowledge! ⭐";
    return "You're a cosmic genius! 🌌";
  };

  if (quizState === 'start') {
    return (
      <div className="space-quiz-view animate-fade-in">
        <div className="section-header-cosmic">
          <div className="header-badge">
            <Sparkles size={14} color="#38bdf8" />
            <span>Challenge yourself</span>
          </div>
          <h2>SPACE QUIZ</h2>
          <p>Test your knowledge about the cosmos with random questions.</p>
        </div>
        <div className="quiz-start-screen">
          <button className="quiz-start-btn" onClick={startQuiz}>
            <Sparkles size={18} />
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'result') {
    return (
      <div className="space-quiz-view animate-fade-in">
        <div className="quiz-result-screen">
          <Trophy size={48} color="#fbbf24" style={{ marginBottom: '16px' }} />
          <h2>Quiz Complete!</h2>
          <div className="quiz-score-circle">
            <span className="quiz-score-number">{score}</span>
            <span>/ 10</span>
          </div>
          <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '24px' }}>
            {getScoreMessage()}
          </p>
          <button className="btn-primary-cosmic" onClick={startQuiz}>
            <RotateCcw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = ((currentIndex) / questions.length) * 100;

  return (
    <div className="space-quiz-view animate-fade-in">
      <div className="quiz-container">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        
        <div className="quiz-question-card glass-panel">
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
            QUESTION {currentIndex + 1} OF 10
          </div>
          <h3 className="quiz-question-text">{currentQ.question}</h3>
          
          <div className="quiz-options-grid">
            {currentQ.options.map((opt, idx) => {
              let btnClass = "quiz-option";
              if (isChecking) {
                btnClass += " disabled";
                if (idx === currentQ.correct) btnClass += " correct";
                else if (idx === selectedOption) btnClass += " wrong";
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleOptionClick(idx)}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
                  {isChecking && idx === currentQ.correct && <CheckCircle2 size={18} color="#10b981" />}
                  {isChecking && idx === selectedOption && idx !== currentQ.correct && <XCircle size={18} color="#ef4444" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
