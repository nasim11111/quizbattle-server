const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion
} = require("firebase/firestore");
const GameRoom = require("./gameLogic");

const firebaseConfig = {
  apiKey: "AIzaSyB6V8npz3iUyXQz6SRu6MJuWcBuiIEuEn4",
  authDomain: "quizbattle000000.firebaseapp.com",
  projectId: "quizbattle000000",
  storageBucket: "quizbattle000000.firebasestorage.app",
  messagingSenderId: "639491539214",
  appId: "1:639491539214:web:ec33fca1bbde15ae57175f"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const waitingRooms = new Map();
const activeGames = new Map();

async function fetchQuestions(isTiebreaker = false, playerUids = []) {
  try {
    // Get all seen questions for all players in this game
    const seenQuestionIds = new Set();

    for (const uid of playerUids) {
      try {
        const userDoc = await getDocs(
          query(
            collection(db, "userQuestionHistory"),
            where("userId", "==", uid)
          )
        );
        userDoc.docs.forEach(d => {
          const data = d.data();
          if (data.questionIds) {
            data.questionIds.forEach(id => seenQuestionIds.add(id));
          }
        });
      } catch (e) {
        console.log("Error fetching history for", uid);
      }
    }

    console.log(`📋 Total seen questions across players: ${seenQuestionIds.size}`);

    if (isTiebreaker) {
      const hardQuery = query(
        collection(db, "questions"),
        where("difficulty", "==", "hard")
      );
      const snap = await getDocs(hardQuery);
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter out seen
      let unseen = all.filter(q => !seenQuestionIds.has(q.id));

      // If all seen, reset and use all
      if (unseen.length < 5) {
        console.log("⚠️ Not enough unseen hard questions, using all");
        unseen = all;
      }

      return unseen.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    // Normal game
    const easyQuery = query(
      collection(db, "questions"),
      where("difficulty", "==", "easy")
    );
    const easySnap = await getDocs(easyQuery);
    let easyAll = easySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const hardQuery = query(
      collection(db, "questions"),
      where("difficulty", "==", "hard")
    );
    const hardSnap = await getDocs(hardQuery);
    let hardAll = hardSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter out seen questions
    let easyUnseen = easyAll.filter(q => !seenQuestionIds.has(q.id));
    let hardUnseen = hardAll.filter(q => !seenQuestionIds.has(q.id));

    // If not enough unseen, use all available
    if (easyUnseen.length < 7) {
      console.log("⚠️ Not enough unseen easy, using all");
      easyUnseen = easyAll;
    }
    if (hardUnseen.length < 3) {
      console.log("⚠️ Not enough unseen hard, using all");
      hardUnseen = hardAll;
    }

    const easy7 = easyUnseen.sort(() => Math.random() - 0.5).slice(0, 7);
    const hard3 = hardUnseen.sort(() => Math.random() - 0.5).slice(0, 3);

    return [...easy7, ...hard3];
  } catch (error) {
    console.log("Error fetching questions:", error);
    return [];
  }
}

io.on("connection", (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  socket.on("joinLobby", async (data) => {
    const { roomType, roomData, playerData } = data;
    console.log(`👤 ${playerData.name} joining ${roomType}`);

    if (!waitingRooms.has(roomType)) {
      waitingRooms.set(roomType, []);
    }

    const waiting = waitingRooms.get(roomType);
    const existingIndex = waiting.findIndex(
      p => p.playerData.uid === playerData.uid
    );
    if (existingIndex !== -1) waiting.splice(existingIndex, 1);

    waiting.push({ socketId: socket.id, playerData, roomData });
    socket.join(`lobby_${roomType}`);

    io.to(`lobby_${roomType}`).emit("lobbyUpdate", {
      count: waiting.length,
      players: waiting.map(p => ({
        name: p.playerData.name,
        uid: p.playerData.uid
      })),
      minPlayers: roomData.minPlayers,
      maxPlayers: roomData.maxPlayers
    });

    console.log(`Waiting ${roomType}: ${waiting.length}/${roomData.minPlayers}`);

    if (waiting.length >= roomData.minPlayers) {
      const playersForGame = waiting.splice(0, roomData.maxPlayers);
      waitingRooms.set(roomType, waiting);

      let count = 5;
      const countdownInterval = setInterval(() => {
        playersForGame.forEach(p => {
          io.to(p.socketId).emit("countdown", { count });
        });
        count--;
        if (count < 0) {
          clearInterval(countdownInterval);
          startGame(playersForGame, roomData);
        }
      }, 1000);
    }
  });

  socket.on("leaveLobby", (data) => {
    const { roomType } = data;
    if (waitingRooms.has(roomType)) {
      const waiting = waitingRooms.get(roomType);
      const updated = waiting.filter(p => p.socketId !== socket.id);
      waitingRooms.set(roomType, updated);
      io.to(`lobby_${roomType}`).emit("lobbyUpdate", {
        count: updated.length,
        players: updated.map(p => ({
          name: p.playerData.name,
          uid: p.playerData.uid
        })),
        minPlayers: data.roomData?.minPlayers || 2,
        maxPlayers: data.roomData?.maxPlayers || 100
      });
    }
    socket.leave(`lobby_${roomType}`);
  });

  socket.on("submitAnswer", (data) => {
    const { gameId, answerIndex } = data;
    const game = activeGames.get(gameId);
    if (!game) return;

    const recorded = game.recordAnswer(socket.id, answerIndex);
    if (!recorded) return;

    console.log(`Answer from ${socket.id}: ${answerIndex}`);

    if (game.allPlayersAnswered()) {
      clearTimeout(game.timer);
      processQuestionEnd(gameId, game);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    waitingRooms.forEach((players, roomType) => {
      const updated = players.filter(p => p.socketId !== socket.id);
      waitingRooms.set(roomType, updated);
    });

    activeGames.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.removePlayer(socket.id);
        io.to(gameId).emit("playerLeft", {
          playersLeft: game.getPlayerCount()
        });

        if (game.getPlayerCount() === 1) {
          const remaining = [...game.players.entries()][0];
          if (remaining) {
            endGame(gameId, game, [{
              socketId: remaining[0],
              name: remaining[1].name,
              score: game.scores.get(remaining[0]) || 0
            }]);
          }
        }

        if (game.getPlayerCount() === 0) {
          activeGames.delete(gameId);
        }
      }
    });
  });
});

async function startGame(players, roomData, isTiebreaker = false) {
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🎮 Starting ${isTiebreaker ? "TIEBREAKER" : "game"}: ${gameId}`);

  // Get all player UIDs to track question history
  const playerUids = players.map(p => p.playerData.uid);

  const questions = await fetchQuestions(isTiebreaker, playerUids);

  if (questions.length === 0) {
    players.forEach(p => {
      io.to(p.socketId).emit("gameError", { message: "No questions found!" });
    });
    return;
  }

  // Save question IDs to each player's history
  for (const uid of playerUids) {
    try {
      const historyRef = doc(db, "userQuestionHistory", uid);
      const historyDoc = await getDoc(historyRef);
      const questionIds = questions.map(q => q.id);

      if (historyDoc.exists()) {
        await updateDoc(historyRef, {
          questionIds: arrayUnion(...questionIds),
          lastUpdated: new Date()
        });
      } else {
        await setDoc(historyRef, {
          userId: uid,
          questionIds: questionIds,
          createdAt: new Date(),
          lastUpdated: new Date()
        });
      }
    } catch (e) {
      console.log("Error saving history for", uid, e.message);
    }
  }

  const game = new GameRoom(gameId, roomData, questions);

  players.forEach(p => {
    game.addPlayer(p.socketId, p.playerData);
    io.sockets.sockets.get(p.socketId)?.join(gameId);
  });

  activeGames.set(gameId, game);
  game.gameStarted = true;
  game.tiebreakerMode = isTiebreaker;

  io.to(gameId).emit("gameStart", {
    gameId,
    totalPlayers: players.length,
    totalQuestions: questions.length,
    isTiebreaker,
    players: players.map(p => ({
      name: p.playerData.name,
      uid: p.playerData.uid
    }))
  });

  setTimeout(() => sendQuestion(gameId, game), 2000);
}

function sendQuestion(gameId, game) {
  const q = game.getCurrentQuestion();
  const questionIndex = game.currentQuestion;
  const totalQuestions = game.questions.length;

  console.log(`❓ Q${questionIndex + 1}/${totalQuestions} → ${gameId}`);

  io.to(gameId).emit("newQuestion", {
    questionIndex,
    totalQuestions,
    question: q.question,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: 20
  });

  game.timer = setTimeout(() => {
    processQuestionEnd(gameId, game);
  }, 20 * 1000);
}

function processQuestionEnd(gameId, game) {
  const results = game.processAnswers();
  const currentQ = game.questions[game.currentQuestion];
  const scores = game.getScores();

  console.log(`✅ Q${game.currentQuestion + 1} done`);

  const resultsData = {};
  results.forEach((result, socketId) => {
    resultsData[socketId] = result;
  });

  io.to(gameId).emit("questionResult", {
    correctAnswer: currentQ.correct,
    results: resultsData,
    scores,
    questionIndex: game.currentQuestion
  });

  setTimeout(() => {
    if (game.hasMoreQuestions()) {
      game.nextQuestion();
      sendQuestion(gameId, game);
    } else {
      handleGameEnd(gameId, game);
    }
  }, 2500);
}

async function handleGameEnd(gameId, game) {
  const scores = game.getScores();
  const winners = game.findWinners();

  console.log(`🏁 Game ended. Winners: ${winners.map(w => w.name).join(", ")}`);

  if (winners.length > 1) {
    console.log(`🤝 TIE! Starting tiebreaker...`);

    game.players.forEach((player, socketId) => {
      const isWinner = winners.find(w => w.socketId === socketId);
      if (isWinner) {
        io.to(socketId).emit("tiebreaker", {
          message: "It's a tie! Hard Round starting!",
          yourScore: game.scores.get(socketId) || 0,
          allScores: scores
        });
      } else {
        io.to(socketId).emit("gameOver", {
          isWinner: false,
          isTie: false,
          rank: scores.findIndex(s => s.socketId === socketId) + 1,
          score: game.scores.get(socketId) || 0,
          totalQuestions: game.questions.length,
          prize: 0,
          allScores: scores
        });
      }
    });

    setTimeout(async () => {
      const tiedPlayers = winners.map(w => ({
        socketId: w.socketId,
        playerData: game.players.get(w.socketId),
        roomData: game.roomData
      }));
      activeGames.delete(gameId);
      await startGame(tiedPlayers, game.roomData, true);
    }, 3000);

    return;
  }

  endGame(gameId, game, winners);
}

function endGame(gameId, game, winners) {
  const scores = game.getScores();
  const totalPlayers = game.players.size;
  const totalPool = game.roomData.entry * totalPlayers;
  const prizePool = Math.floor(totalPool * 0.9);
  const winner = winners[0];

  console.log(`🏆 Winner: ${winner?.name}`);

  game.players.forEach((player, socketId) => {
    const isWinner = winner?.socketId === socketId;
    const playerScore = game.scores.get(socketId) || 0;
    const rank = scores.findIndex(s => s.socketId === socketId) + 1;

    io.to(socketId).emit("gameOver", {
      isWinner,
      isTie: false,
      rank,
      score: playerScore,
      totalQuestions: game.questions.length,
      prize: isWinner ? prizePool : 0,
      allScores: scores,
      winnerName: winner?.name
    });
  });

  activeGames.delete(gameId);
}

app.get("/", (req, res) => {
  res.json({
    status: "QuizBattle Server Running! 🎮",
    activeGames: activeGames.size,
    waitingPlayers: [...waitingRooms.values()].reduce((a, b) => a + b.length, 0)
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 QuizBattle Server Started!
📡 Port: ${PORT}
🎮 Ready for players!
  `);
});