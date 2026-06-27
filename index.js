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
  addDoc,
  increment,
  arrayUnion
} = require("firebase/firestore");
const Contest = require("./gameLogic");

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

// PRACTICE ROOM (instant game - old system)
const practiceRooms = new Map(); // roomType -> [players]
const practiceGames = new Map(); // gameId -> game

// TOURNAMENT CONTESTS (new system for paid rooms)
const waitingContests = new Map(); // roomType -> Contest (waiting to fill)
const activeContests = new Map(); // contestId -> Contest

// ========== HELPER: Fetch random questions ==========
async function fetchRandomQuestions(playerUid, count = 10) {
  try {
    // Get user's seen questions
    const seenQuestionIds = new Set();
    const userDoc = await getDocs(
      query(
        collection(db, "userQuestionHistory"),
        where("userId", "==", playerUid)
      )
    );
    userDoc.docs.forEach(d => {
      const data = d.data();
      if (data.questionIds) {
        data.questionIds.forEach(id => seenQuestionIds.add(id));
      }
    });

    // Fetch all easy + hard
    const easySnap = await getDocs(
      query(collection(db, "questions"), where("difficulty", "==", "easy"))
    );
    const hardSnap = await getDocs(
      query(collection(db, "questions"), where("difficulty", "==", "hard"))
    );

    let easyAll = easySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    let hardAll = hardSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter unseen
    let easyUnseen = easyAll.filter(q => !seenQuestionIds.has(q.id));
    let hardUnseen = hardAll.filter(q => !seenQuestionIds.has(q.id));

    if (easyUnseen.length < 7) easyUnseen = easyAll;
    if (hardUnseen.length < 3) hardUnseen = hardAll;

    const easy7 = easyUnseen.sort(() => Math.random() - 0.5).slice(0, 7);
    const hard3 = hardUnseen.sort(() => Math.random() - 0.5).slice(0, 3);
    const selected = [...easy7, ...hard3].sort(() => Math.random() - 0.5);

    // Save to user history
    try {
      const historyRef = doc(db, "userQuestionHistory", playerUid);
      const historyDoc = await getDoc(historyRef);
      const questionIds = selected.map(q => q.id);

      if (historyDoc.exists()) {
        await updateDoc(historyRef, {
          questionIds: arrayUnion(...questionIds),
          lastUpdated: new Date()
        });
      } else {
        await setDoc(historyRef, {
          userId: playerUid,
          questionIds: questionIds,
          createdAt: new Date(),
          lastUpdated: new Date()
        });
      }
    } catch (e) {
      console.log("Error saving history:", e.message);
    }

    return selected;
  } catch (e) {
    console.log("Error fetching questions:", e);
    return [];
  }
}

// ========== PRACTICE GAME (Old fast system) ==========
async function fetchPracticeQuestions(playerUid) {
  return await fetchRandomQuestions(playerUid, 10);
}

// ========== CONTEST FUNCTIONS ==========

async function startContest(contest, players) {
  contest.start();
  const contestId = contest.contestId;
  activeContests.set(contestId, contest);

  console.log(`🏁 Contest STARTED: ${contestId}`);
  console.log(`⏱ Duration: 10 minutes`);
  console.log(`👥 Players: ${players.length}`);

  // Send each player their own questions
  for (const playerInfo of players) {
    const questions = await fetchRandomQuestions(playerInfo.playerData.uid);
    contest.addPlayer(playerInfo.playerData.uid, playerInfo.socketId, playerInfo.playerData, questions);

    io.to(playerInfo.socketId).emit("contestStart", {
      contestId,
      contestEndTime: contest.endTime,
      totalQuestions: questions.length,
      gameDuration: 200, // 200 seconds for own game
      roomName: contest.roomData.name,
      entry: contest.roomData.entry
    });

    // Deduct entry fee
    try {
      await updateDoc(doc(db, "users", playerInfo.playerData.uid), {
        coins: increment(-contest.roomData.entry)
      });
      console.log(`💰 Entry ${contest.roomData.entry} deducted from ${playerInfo.playerData.name}`);
    } catch (e) {
      console.log("Error deducting fee:", e.message);
    }
  }

  // Set contest end timer
  contest.timer = setTimeout(() => {
    endContest(contestId);
  }, contest.contestDuration);

  // Live leaderboard broadcast every 10 sec
  contest.leaderboardInterval = setInterval(() => {
    const leaderboard = contest.getLiveLeaderboard();
    contest.players.forEach((player) => {
      if (player.status !== "left") {
        io.to(player.socketId).emit("liveLeaderboard", {
          leaderboard,
          timeLeft: contest.getTimeLeft()
        });
      }
    });
  }, 10000);
}

async function joinExistingContest(contest, socketId, playerData) {
  const questions = await fetchRandomQuestions(playerData.uid);
  const added = contest.addPlayer(playerData.uid, socketId, playerData, questions);
  if (!added) return false;

  io.to(socketId).emit("contestStart", {
    contestId: contest.contestId,
    contestEndTime: contest.endTime,
    totalQuestions: questions.length,
    gameDuration: 200,
    roomName: contest.roomData.name,
    entry: contest.roomData.entry,
    joinedLate: true
  });

  // Deduct entry fee
  try {
    await updateDoc(doc(db, "users", playerData.uid), {
      coins: increment(-contest.roomData.entry)
    });
  } catch (e) {
    console.log("Error deducting fee:", e.message);
  }

  return true;
}

async function endContest(contestId) {
  const contest = activeContests.get(contestId);
  if (!contest) return;

  contest.end();
  clearTimeout(contest.timer);
  clearInterval(contest.leaderboardInterval);

  const scores = contest.getFinalScores();
  const winners = contest.findWinners();
  const totalPlayers = contest.players.size;
  const totalPool = contest.roomData.entry * totalPlayers;
  const prizePool = Math.floor(totalPool * 0.9);
  
  // Split prize among tied winners
  const prizePerWinner = winners.length > 0 ? Math.floor(prizePool / winners.length) : 0;
  const winnerNames = winners.map(w => w.name).join(", ");

  console.log(`🏁 Contest ENDED: ${contestId}`);
  console.log(`🏆 Winners: ${winnerNames}`);
  console.log(`💰 Prize per winner: ${prizePerWinner}`);

  // Send results to all players
  for (const [uid, player] of contest.players) {
    if (player.status === "left") continue;

    const isWinner = winners.find(w => w.uid === uid);
    const rank = scores.findIndex(s => s.uid === uid) + 1;
    const prize = isWinner ? prizePerWinner : 0;

    // Update user stats and add prize
    try {
      if (isWinner) {
        await updateDoc(doc(db, "users", uid), {
          coins: increment(prize),
          totalWins: increment(1),
          totalGames: increment(1)
        });
      } else {
        await updateDoc(doc(db, "users", uid), {
          totalGames: increment(1)
        });
      }

      // Save match history
      await addDoc(collection(db, "matchHistory"), {
        userId: uid,
        userName: player.name,
        roomName: contest.roomData.name,
        roomEntry: contest.roomData.entry,
        isWinner: !!isWinner,
        rank,
        score: player.score,
        totalQuestions: player.questions.length,
        totalPlayers,
        prize,
        winnerName: winnerNames,
        leftEarly: false,
        contestId,
        playedAt: new Date()
      });
    } catch (e) {
      console.log("Error saving results:", e.message);
    }

    // Emit results
    io.to(player.socketId).emit("contestEnd", {
      contestId,
      isWinner: !!isWinner,
      rank,
      score: player.score,
      totalQuestions: player.questions.length,
      prize,
      winnerName: winnerNames,
      allScores: scores
    });
  }

  activeContests.delete(contestId);
}

// ========== PRACTICE GAME (Old system) ==========
async function startPracticeGame(players, roomData) {
  const gameId = `practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🎮 Starting practice: ${gameId}`);

  const game = {
    gameId,
    roomData,
    players: new Map(),
    scores: new Map(),
    answers: new Map(),
    answeredCount: 0,
    currentQuestion: 0,
    questions: [],
    timer: null
  };

  // Get questions for first player (others get same)
  const firstUid = players[0].playerData.uid;
  game.questions = await fetchRandomQuestions(firstUid);

  if (game.questions.length === 0) {
    players.forEach(p => {
      io.to(p.socketId).emit("gameError", { message: "No questions!" });
    });
    return;
  }

  players.forEach(p => {
    game.players.set(p.socketId, p.playerData);
    game.scores.set(p.socketId, 0);
    io.sockets.sockets.get(p.socketId)?.join(gameId);
  });

  practiceGames.set(gameId, game);

  io.to(gameId).emit("gameStart", {
    gameId,
    totalPlayers: players.length,
    totalQuestions: game.questions.length,
    isTiebreaker: false,
    players: players.map(p => ({ name: p.playerData.name, uid: p.playerData.uid }))
  });

  setTimeout(() => sendPracticeQuestion(gameId), 2000);
}

function sendPracticeQuestion(gameId) {
  const game = practiceGames.get(gameId);
  if (!game) return;

  const q = game.questions[game.currentQuestion];
  io.to(gameId).emit("newQuestion", {
    questionIndex: game.currentQuestion,
    totalQuestions: game.questions.length,
    question: q.question,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: 20
  });

  game.timer = setTimeout(() => processPracticeQuestionEnd(gameId), 20000);
}

function processPracticeQuestionEnd(gameId) {
  const game = practiceGames.get(gameId);
  if (!game) return;

  const currentQ = game.questions[game.currentQuestion];
  const results = {};

  game.players.forEach((player, socketId) => {
    const answer = game.answers.get(socketId);
    const correct = answer === currentQ.correct;
    if (correct) {
      game.scores.set(socketId, (game.scores.get(socketId) || 0) + 1);
    }
    results[socketId] = {
      answer: answer !== undefined ? answer : -1,
      correct,
      score: game.scores.get(socketId) || 0
    };
  });

  const scoresList = [];
  game.players.forEach((player, socketId) => {
    scoresList.push({
      socketId,
      name: player.name,
      score: game.scores.get(socketId) || 0
    });
  });
  scoresList.sort((a, b) => b.score - a.score);

  io.to(gameId).emit("questionResult", {
    correctAnswer: currentQ.correct,
    results,
    scores: scoresList,
    questionIndex: game.currentQuestion
  });

  setTimeout(() => {
    if (game.currentQuestion < game.questions.length - 1) {
      game.currentQuestion++;
      game.answers = new Map();
      game.answeredCount = 0;
      sendPracticeQuestion(gameId);
    } else {
      endPracticeGame(gameId);
    }
  }, 2500);
}

function endPracticeGame(gameId) {
  const game = practiceGames.get(gameId);
  if (!game) return;

  const scoresList = [];
  game.players.forEach((player, socketId) => {
    scoresList.push({
      socketId,
      name: player.name,
      score: game.scores.get(socketId) || 0
    });
  });
  scoresList.sort((a, b) => b.score - a.score);

  const topScore = scoresList[0]?.score || 0;
  const winners = scoresList.filter(s => s.score === topScore);
  const winner = winners[0];

  game.players.forEach((player, socketId) => {
    const isWinner = winner?.socketId === socketId;
    const rank = scoresList.findIndex(s => s.socketId === socketId) + 1;
    io.to(socketId).emit("gameOver", {
      isWinner,
      isTie: false,
      rank,
      score: game.scores.get(socketId) || 0,
      totalQuestions: game.questions.length,
      prize: 0,
      allScores: scoresList,
      winnerName: winner?.name
    });
  });

  practiceGames.delete(gameId);
}

// ========== SOCKET HANDLERS ==========

io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // ===== PRACTICE ROOM (instant) =====
  socket.on("joinPractice", async (data) => {
    const { roomType, roomData, playerData } = data;
    console.log(`👤 ${playerData.name} joining PRACTICE`);

    if (!practiceRooms.has(roomType)) practiceRooms.set(roomType, []);
    const waiting = practiceRooms.get(roomType);
    
    const existingIdx = waiting.findIndex(p => p.playerData.uid === playerData.uid);
    if (existingIdx !== -1) waiting.splice(existingIdx, 1);

    waiting.push({ socketId: socket.id, playerData, roomData });
    socket.join(`practice_lobby_${roomType}`);

    io.to(`practice_lobby_${roomType}`).emit("lobbyUpdate", {
      count: waiting.length,
      players: waiting.map(p => ({ name: p.playerData.name, uid: p.playerData.uid })),
      minPlayers: roomData.minPlayers,
      maxPlayers: roomData.maxPlayers
    });

    if (waiting.length >= roomData.minPlayers) {
      const players = waiting.splice(0, roomData.maxPlayers);
      practiceRooms.set(roomType, waiting);

      let count = 5;
      const interval = setInterval(() => {
        players.forEach(p => io.to(p.socketId).emit("countdown", { count }));
        count--;
        if (count < 0) {
          clearInterval(interval);
          startPracticeGame(players, roomData);
        }
      }, 1000);
    }
  });

  // ===== CONTEST (paid rooms) =====
  socket.on("joinContest", async (data) => {
    const { roomType, roomData, playerData } = data;
    console.log(`🏁 ${playerData.name} joining CONTEST ${roomType}`);

    // Check if already in active contest
    for (const [contestId, contest] of activeContests) {
      if (contest.roomData.id === roomData.id && contest.players.has(playerData.uid)) {
        const player = contest.players.get(playerData.uid);
        if (player.status === "playing") {
          // Reconnect
          contest.updateSocketId(playerData.uid, socket.id);
          socket.join(contestId);
          io.to(socket.id).emit("contestReconnect", {
            contestId,
            contestEndTime: contest.endTime,
            totalQuestions: player.questions.length,
            gameDuration: 200,
            roomName: contest.roomData.name,
            entry: contest.roomData.entry,
            currentQuestion: player.currentQ,
            score: player.score
          });
          return;
        }
      }
    }

    // Check if there's a joinable active contest
    let joinableContest = null;
    for (const [contestId, contest] of activeContests) {
      if (contest.roomData.id === roomData.id && contest.canJoin() && !contest.players.has(playerData.uid)) {
        joinableContest = contest;
        break;
      }
    }

    if (joinableContest) {
      console.log(`✨ Joining existing contest: ${joinableContest.contestId}`);
      socket.join(joinableContest.contestId);
      await joinExistingContest(joinableContest, socket.id, playerData);
      return;
    }

    // No joinable contest - go to waiting room
    if (!waitingContests.has(roomType)) {
      waitingContests.set(roomType, {
        players: [],
        roomData
      });
    }

    const waiting = waitingContests.get(roomType);
    const existingIdx = waiting.players.findIndex(p => p.playerData.uid === playerData.uid);
    if (existingIdx !== -1) waiting.players.splice(existingIdx, 1);

    waiting.players.push({ socketId: socket.id, playerData, roomData });
    socket.join(`contest_waiting_${roomType}`);

    io.to(`contest_waiting_${roomType}`).emit("lobbyUpdate", {
      count: waiting.players.length,
      players: waiting.players.map(p => ({ name: p.playerData.name, uid: p.playerData.uid })),
      minPlayers: roomData.minPlayers,
      maxPlayers: roomData.maxPlayers
    });

    console.log(`⏳ Waiting ${roomType}: ${waiting.players.length}/${roomData.minPlayers}`);

    // Start contest if enough players
    if (waiting.players.length >= roomData.minPlayers) {
      const players = waiting.players.splice(0, roomData.maxPlayers);
      
      const contestId = `contest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const contest = new Contest(contestId, roomData);
      
      // Move all players to contest room
      players.forEach(p => {
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.leave(`contest_waiting_${roomType}`);
          playerSocket.join(contestId);
        }
      });

      // Countdown then start
      let count = 5;
      const interval = setInterval(() => {
        players.forEach(p => io.to(p.socketId).emit("countdown", { count }));
        count--;
        if (count < 0) {
          clearInterval(interval);
          startContest(contest, players);
        }
      }, 1000);
    }
  });

  socket.on("leaveLobby", (data) => {
    const { roomType } = data;
    
    // Practice
    if (practiceRooms.has(roomType)) {
      const waiting = practiceRooms.get(roomType);
      const updated = waiting.filter(p => p.socketId !== socket.id);
      practiceRooms.set(roomType, updated);
      io.to(`practice_lobby_${roomType}`).emit("lobbyUpdate", {
        count: updated.length,
        players: updated.map(p => ({ name: p.playerData.name, uid: p.playerData.uid })),
        minPlayers: data.roomData?.minPlayers || 2,
        maxPlayers: data.roomData?.maxPlayers || 100
      });
    }
    
    // Contest waiting
    if (waitingContests.has(roomType)) {
      const waiting = waitingContests.get(roomType);
      waiting.players = waiting.players.filter(p => p.socketId !== socket.id);
      io.to(`contest_waiting_${roomType}`).emit("lobbyUpdate", {
        count: waiting.players.length,
        players: waiting.players.map(p => ({ name: p.playerData.name, uid: p.playerData.uid })),
        minPlayers: data.roomData?.minPlayers || 5,
        maxPlayers: data.roomData?.maxPlayers || 100
      });
    }
    
    socket.leave(`practice_lobby_${roomType}`);
    socket.leave(`contest_waiting_${roomType}`);
  });

  // ===== PRACTICE ANSWER =====
  socket.on("submitAnswer", (data) => {
    const { gameId, answerIndex } = data;
    const game = practiceGames.get(gameId);
    if (!game) return;

    if (game.answers.has(socket.id)) return;
    game.answers.set(socket.id, answerIndex);
    game.answeredCount++;

    if (game.answeredCount >= game.players.size) {
      clearTimeout(game.timer);
      processPracticeQuestionEnd(gameId);
    }
  });

  // ===== CONTEST ANSWER =====
  socket.on("submitContestAnswer", (data) => {
    const { contestId, questionIndex, answerIndex, uid } = data;
    const contest = activeContests.get(contestId);
    if (!contest) return;

    contest.recordAnswer(uid, questionIndex, answerIndex);

    const player = contest.getPlayer(uid);
    if (player && player.currentQ < player.questions.length) {
      // Send next question
      const nextQ = player.questions[player.currentQ];
      io.to(socket.id).emit("contestNextQuestion", {
        questionIndex: player.currentQ,
        totalQuestions: player.questions.length,
        question: nextQ.question,
        options: nextQ.options,
        category: nextQ.category,
        difficulty: nextQ.difficulty,
        timeLimit: 20
      });
    } else if (player && player.status === "finished") {
      // Send waiting for results screen data
      io.to(socket.id).emit("contestGameFinished", {
        contestId,
        yourScore: player.score,
        totalQuestions: player.questions.length,
        contestEndTime: contest.endTime,
        leaderboard: contest.getLiveLeaderboard()
      });
    }
  });

  // ===== Get first question of contest =====
  socket.on("contestRequestFirstQuestion", (data) => {
    const { contestId, uid } = data;
    const contest = activeContests.get(contestId);
    if (!contest) return;
    
    const player = contest.getPlayer(uid);
    if (!player) return;
    
    contest.updateSocketId(uid, socket.id);
    
    const firstQ = player.questions[0];
    io.to(socket.id).emit("contestNextQuestion", {
      questionIndex: 0,
      totalQuestions: player.questions.length,
      question: firstQ.question,
      options: firstQ.options,
      category: firstQ.category,
      difficulty: firstQ.difficulty,
      timeLimit: 20
    });
  });

  // ===== Get active contests list =====
  socket.on("getActiveContests", (data) => {
    const { uid } = data;
    const userContests = [];
    
    for (const [contestId, contest] of activeContests) {
      const player = contest.players.get(uid);
      if (player && player.status !== "left") {
        userContests.push({
          contestId,
          roomName: contest.roomData.name,
          roomId: contest.roomData.id,
          entry: contest.roomData.entry,
          endTime: contest.endTime,
          timeLeft: contest.getTimeLeft(),
          status: player.status,
          yourScore: player.score,
          totalPlayers: contest.players.size
        });
      }
    }
    
    io.to(socket.id).emit("activeContestsList", { contests: userContests });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    // Clean up practice rooms
    practiceRooms.forEach((players, roomType) => {
      const updated = players.filter(p => p.socketId !== socket.id);
      practiceRooms.set(roomType, updated);
    });

    // Clean up practice games
    practiceGames.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        if (game.players.size === 0) practiceGames.delete(gameId);
      }
    });

    // Clean up contest waiting
    waitingContests.forEach((waiting, roomType) => {
      waiting.players = waiting.players.filter(p => p.socketId !== socket.id);
    });

    // Note: For contests, we DON'T remove player on disconnect
    // They can reconnect using their UID
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "QuizBattle Tournament Server 🏆",
    activeContests: activeContests.size,
    waitingContests: waitingContests.size,
    practiceGames: practiceGames.size
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 QuizBattle Tournament Server Started!
📡 Port: ${PORT}
🏆 Tournament mode active
🎮 Practice mode active
  `);
});