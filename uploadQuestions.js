const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB6V8npz3iUyXQz6SRu6MJuWcBuiIEuEn4",
  authDomain: "quizbattle000000.firebaseapp.com",
  projectId: "quizbattle000000",
  storageBucket: "quizbattle000000.firebasestorage.app",
  messagingSenderId: "639491539214",
  appId: "1:639491539214:web:ec33fca1bbde15ae57175f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const questions = [
  // ========== EASY QUESTIONS ==========
  {
    question: "What is the capital of India?",
    options: ["Mumbai", "Delhi", "Chennai", "Kolkata"],
    correct: 1,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many days are in a week?",
    options: ["5", "6", "7", "8"],
    correct: 2,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Earth", "Mercury", "Mars"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What color is the sky on a clear day?",
    options: ["Green", "Blue", "Red", "Yellow"],
    correct: 1,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "How many legs does a spider have?",
    options: ["6", "8", "10", "4"],
    correct: 1,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is 10 + 10?",
    options: ["15", "18", "20", "22"],
    correct: 2,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Which animal is known as the King of the Jungle?",
    options: ["Tiger", "Elephant", "Lion", "Leopard"],
    correct: 2,
    difficulty: "easy",
    category: "Animals"
  },
  {
    question: "How many months are in a year?",
    options: ["10", "11", "12", "13"],
    correct: 2,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Which fruit is yellow and curved?",
    options: ["Apple", "Banana", "Mango", "Grape"],
    correct: 1,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "What is 5 x 5?",
    options: ["20", "25", "30", "35"],
    correct: 1,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Who is the first person to walk on the Moon?",
    options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
    correct: 1,
    difficulty: "easy",
    category: "History"
  },
  {
    question: "What is the national bird of India?",
    options: ["Sparrow", "Eagle", "Peacock", "Parrot"],
    correct: 2,
    difficulty: "easy",
    category: "India"
  },
  {
    question: "How many sides does a triangle have?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Which is the tallest mountain in the world?",
    options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "What do bees produce?",
    options: ["Milk", "Honey", "Wax only", "Sugar"],
    correct: 1,
    difficulty: "easy",
    category: "Animals"
  },
  {
    question: "Which country is known as the Land of the Rising Sun?",
    options: ["China", "Korea", "Japan", "Thailand"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "What is the capital of the USA?",
    options: ["New York", "Los Angeles", "Chicago", "Washington DC"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many zeros are in one thousand?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "What is H2O commonly known as?",
    options: ["Salt", "Sugar", "Water", "Acid"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which is the smallest continent?",
    options: ["Europe", "Antarctica", "Australia", "South America"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "What is the national animal of India?",
    options: ["Lion", "Elephant", "Tiger", "Leopard"],
    correct: 2,
    difficulty: "easy",
    category: "India"
  },
  {
    question: "How many planets are in our solar system?",
    options: ["7", "8", "9", "10"],
    correct: 1,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which gas do plants absorb from the atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is the currency of India?",
    options: ["Dollar", "Pound", "Rupee", "Euro"],
    correct: 2,
    difficulty: "easy",
    category: "India"
  },
  {
    question: "Who wrote the Harry Potter series?",
    options: ["Tolkien", "Rowling", "King", "Martin"],
    correct: 1,
    difficulty: "easy",
    category: "Books"
  },
  {
    question: "What is the chemical symbol for Gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "How many continents are on Earth?",
    options: ["5", "6", "7", "8"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Which sport uses a bat and ball and has 11 players per team?",
    options: ["Football", "Hockey", "Cricket", "Baseball"],
    correct: 2,
    difficulty: "easy",
    category: "Sports"
  },
  {
    question: "What is the largest country by area?",
    options: ["USA", "China", "Canada", "Russia"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Which organ pumps blood in the human body?",
    options: ["Liver", "Kidney", "Heart", "Lung"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is 100 divided by 4?",
    options: ["20", "25", "30", "40"],
    correct: 1,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Which is the longest river in the world?",
    options: ["Amazon", "Yangtze", "Nile", "Mississippi"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Who invented the telephone?",
    options: ["Edison", "Tesla", "Bell", "Newton"],
    correct: 2,
    difficulty: "easy",
    category: "History"
  },
  {
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Madrid", "Paris"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many hours are in a day?",
    options: ["12", "20", "24", "48"],
    correct: 2,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is the boiling point of water?",
    options: ["50°C", "75°C", "100°C", "150°C"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which country won the FIFA World Cup 2022?",
    options: ["Brazil", "France", "Argentina", "Germany"],
    correct: 2,
    difficulty: "easy",
    category: "Sports"
  },
  {
    question: "What is the full form of CPU?",
    options: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Power Unit",
      "Core Processing Unit"
    ],
    correct: 0,
    difficulty: "easy",
    category: "Technology"
  },
  {
    question: "Which is the largest desert in the world?",
    options: ["Sahara", "Arabian", "Gobi", "Antarctic"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many bones are in an adult human body?",
    options: ["186", "196", "206", "216"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is the capital of Japan?",
    options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Which is the smallest planet in our solar system?",
    options: ["Mars", "Mercury", "Venus", "Pluto"],
    correct: 1,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Central Program Unit",
      "Computer Processing Unit",
      "Core Power Unit"
    ],
    correct: 0,
    difficulty: "easy",
    category: "Technology"
  },
  {
    question: "What is the square root of 144?",
    options: ["10", "11", "12", "13"],
    correct: 2,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Which country is the Eiffel Tower located in?",
    options: ["Italy", "Spain", "France", "Germany"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many teeth does an adult human have?",
    options: ["28", "30", "32", "34"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is the national flower of India?",
    options: ["Rose", "Sunflower", "Lotus", "Jasmine"],
    correct: 2,
    difficulty: "easy",
    category: "India"
  },
  {
    question: "Which metal is liquid at room temperature?",
    options: ["Iron", "Gold", "Mercury", "Silver"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is 15 x 15?",
    options: ["200", "215", "225", "235"],
    correct: 2,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Picasso", "Van Gogh", "Da Vinci", "Michelangelo"],
    correct: 2,
    difficulty: "easy",
    category: "Art"
  },
  {
    question: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Which element has the symbol O?",
    options: ["Gold", "Osmium", "Oxygen", "Oganesson"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "How many minutes are in an hour?",
    options: ["30", "45", "60", "90"],
    correct: 2,
    difficulty: "easy",
    category: "General"
  },
  {
    question: "Which is the fastest land animal?",
    options: ["Lion", "Horse", "Cheetah", "Leopard"],
    correct: 2,
    difficulty: "easy",
    category: "Animals"
  },
  {
    question: "What is the chemical symbol for water?",
    options: ["WO", "HO", "H2O", "W2O"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which country has the largest population?",
    options: ["USA", "India", "China", "Russia"],
    correct: 1,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "What is the capital of Germany?",
    options: ["Munich", "Hamburg", "Frankfurt", "Berlin"],
    correct: 3,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["4", "5", "6", "7"],
    correct: 2,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "What is the hardest natural substance on Earth?",
    options: ["Gold", "Iron", "Diamond", "Platinum"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which Indian cricketer is known as the God of Cricket?",
    options: ["Virat Kohli", "MS Dhoni", "Sachin Tendulkar", "Rohit Sharma"],
    correct: 2,
    difficulty: "easy",
    category: "Sports"
  },
  {
    question: "What is the capital of China?",
    options: ["Shanghai", "Hong Kong", "Beijing", "Guangzhou"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Who is the founder of Microsoft?",
    options: ["Steve Jobs", "Elon Musk", "Bill Gates", "Mark Zuckerberg"],
    correct: 2,
    difficulty: "easy",
    category: "Technology"
  },
  {
    question: "What is the full form of DNA?",
    options: [
      "Deoxyribonucleic Acid",
      "Dioxynucleic Acid",
      "Deoxyribose Nucleic Acid",
      "Digital Nucleic Acid"
    ],
    correct: 0,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which is the longest bone in the human body?",
    options: ["Spine", "Femur", "Tibia", "Humerus"],
    correct: 1,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "What is the capital of Brazil?",
    options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "Who invented the light bulb?",
    options: ["Tesla", "Bell", "Edison", "Newton"],
    correct: 2,
    difficulty: "easy",
    category: "History"
  },
  {
    question: "What is 20% of 200?",
    options: ["20", "30", "40", "50"],
    correct: 2,
    difficulty: "easy",
    category: "Math"
  },
  {
    question: "Which ocean is the smallest?",
    options: ["Atlantic", "Indian", "Arctic", "Southern"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },
  {
    question: "What is the speed of light approximately?",
    options: ["3×10⁶ m/s", "3×10⁷ m/s", "3×10⁸ m/s", "3×10⁹ m/s"],
    correct: 2,
    difficulty: "easy",
    category: "Science"
  },
  {
    question: "Which Indian state has the highest population?",
    options: ["Maharashtra", "Bihar", "Uttar Pradesh", "West Bengal"],
    correct: 2,
    difficulty: "easy",
    category: "India"
  },
  {
    question: "What is the capital of Russia?",
    options: ["St. Petersburg", "Kiev", "Moscow", "Minsk"],
    correct: 2,
    difficulty: "easy",
    category: "Geography"
  },

  // ========== HARD QUESTIONS ==========
  {
    question: "What is the derivative of sin(x)?",
    options: ["-sin(x)", "cos(x)", "-cos(x)", "tan(x)"],
    correct: 1,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "Which programming language was created by Guido van Rossum?",
    options: ["Java", "Ruby", "Python", "Perl"],
    correct: 2,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "What is the Heisenberg Uncertainty Principle?",
    options: [
      "Energy cannot be created or destroyed",
      "Position and momentum cannot both be precisely known",
      "Every action has equal and opposite reaction",
      "Matter and energy are equivalent"
    ],
    correct: 1,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "In which year did World War I begin?",
    options: ["1912", "1914", "1916", "1918"],
    correct: 1,
    difficulty: "hard",
    category: "History"
  },
  {
    question: "What is the chemical formula for sulfuric acid?",
    options: ["HCl", "HNO3", "H2SO4", "H3PO4"],
    correct: 2,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "Who wrote 'The Republic'?",
    options: ["Aristotle", "Socrates", "Plato", "Homer"],
    correct: 2,
    difficulty: "hard",
    category: "Philosophy"
  },
  {
    question: "What is the value of Pi to 5 decimal places?",
    options: ["3.14159", "3.14152", "3.14169", "3.14196"],
    correct: 0,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "Which treaty ended World War I?",
    options: [
      "Treaty of Paris",
      "Treaty of Versailles",
      "Treaty of Vienna",
      "Treaty of Berlin"
    ],
    correct: 1,
    difficulty: "hard",
    category: "History"
  },
  {
    question: "What is the atomic number of Gold?",
    options: ["47", "72", "79", "82"],
    correct: 2,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "Which algorithm is used for public key cryptography?",
    options: ["AES", "DES", "RSA", "SHA"],
    correct: 2,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "What is the Fibonacci sequence's 10th number?",
    options: ["34", "44", "55", "65"],
    correct: 2,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "In what year was the first iPhone released?",
    options: ["2005", "2006", "2007", "2008"],
    correct: 2,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"],
    correct: 2,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "Who developed the theory of general relativity?",
    options: ["Newton", "Bohr", "Einstein", "Hawking"],
    correct: 2,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "What is the largest prime number below 100?",
    options: ["89", "91", "93", "97"],
    correct: 3,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "Which country was the first to give women the right to vote?",
    options: ["USA", "UK", "New Zealand", "Australia"],
    correct: 2,
    difficulty: "hard",
    category: "History"
  },
  {
    question: "What does HTTP stand for?",
    options: [
      "HyperText Transfer Protocol",
      "High Transfer Text Protocol",
      "HyperText Transmission Protocol",
      "High Text Transfer Protocol"
    ],
    correct: 0,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "What is the chemical symbol for Tungsten?",
    options: ["Tu", "Tn", "W", "Tg"],
    correct: 2,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "In binary, what is 1010 in decimal?",
    options: ["8", "9", "10", "12"],
    correct: 2,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "Who was the first Prime Minister of India?",
    options: ["Gandhi", "Nehru", "Patel", "Ambedkar"],
    correct: 1,
    difficulty: "hard",
    category: "India"
  },
  {
    question: "What is the integral of 1/x?",
    options: ["x", "1/x²", "ln(x)", "e^x"],
    correct: 2,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "Which planet has the most moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correct: 1,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"],
    correct: 2,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "Which Nobel Prize did Marie Curie win twice?",
    options: ["Physics", "Chemistry", "Both Physics and Chemistry", "Medicine"],
    correct: 2,
    difficulty: "hard",
    category: "History"
  },
  {
    question: "What is Avogadro's number?",
    options: ["6.022×10²³", "6.022×10²²", "6.022×10²⁴", "6.022×10²¹"],
    correct: 0,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "Who wrote 'War and Peace'?",
    options: ["Dostoevsky", "Chekhov", "Tolstoy", "Pushkin"],
    correct: 2,
    difficulty: "hard",
    category: "Books"
  },
  {
    question: "What is the speed of sound in air at 20°C?",
    options: ["243 m/s", "343 m/s", "443 m/s", "543 m/s"],
    correct: 1,
    difficulty: "hard",
    category: "Science"
  },
  {
    question: "Which data structure uses LIFO?",
    options: ["Queue", "Stack", "Tree", "Graph"],
    correct: 1,
    difficulty: "hard",
    category: "Technology"
  },
  {
    question: "What is the Pythagorean theorem?",
    options: ["a+b=c", "a²-b²=c²", "a²+b²=c²", "a×b=c²"],
    correct: 2,
    difficulty: "hard",
    category: "Math"
  },
  {
    question: "In which year did India gain independence?",
    options: ["1945", "1946", "1947", "1948"],
    correct: 2,
    difficulty: "hard",
    category: "India"
  }
];

async function uploadQuestions() {
  console.log("Starting upload...");

  // Get existing questions to prevent duplicates
  const { getDocs } = require("firebase/firestore");
  const existingSnap = await getDocs(collection(db, "questions"));
  const existingQuestions = new Set();
  existingSnap.docs.forEach(doc => {
    existingQuestions.add(doc.data().question);
  });

  console.log(`Found ${existingQuestions.size} existing questions in database`);

  let added = 0;
  let skipped = 0;

  for (const q of questions) {
    if (existingQuestions.has(q.question)) {
      skipped++;
      continue;
    }
    try {
      await addDoc(collection(db, "questions"), q);
      added++;
      console.log(`✅ Added: ${q.question.substring(0, 40)}...`);
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`✅ Added: ${added} new questions`);
  console.log(`⏭️  Skipped: ${skipped} duplicates`);
  process.exit(0);
}

uploadQuestions();