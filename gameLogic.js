// Contest = Tournament with 10 minute timer
class Contest {
  constructor(contestId, roomData, isRematch = false, rematchPlayers = null) {
    this.contestId = contestId;
    this.roomData = roomData;
    this.players = new Map();
    this.startTime = null;
    this.endTime = null;
    this.contestDuration = isRematch ? 5 * 60 * 1000 : 10 * 60 * 1000; // 5 min for rematch
    this.gameDuration = isRematch ? 100 * 1000 : 200 * 1000; // 5 questions for rematch
    this.status = "waiting";
    this.timer = null;
    this.isRematch = isRematch;
    this.rematchPlayers = rematchPlayers; // pre-defined players for rematch
    this.totalPrizePool = 0; // accumulated prize pool from rematches
  }

  addPlayer(uid, socketId, playerData, questions) {
    if (this.players.has(uid)) return false;
    
    this.players.set(uid, {
      uid,
      socketId,
      name: playerData.name,
      joinedAt: Date.now(),
      status: "playing",
      score: 0,
      questions: questions,
      currentQ: 0,
      answers: new Map(),
      gameStartTime: Date.now(),
      gameEndTime: Date.now() + this.gameDuration
    });
    return true;
  }

  removePlayer(uid) {
    const player = this.players.get(uid);
    if (player) player.status = "left";
  }

  getPlayer(uid) {
    return this.players.get(uid);
  }

  getPlayerBySocket(socketId) {
    for (const [uid, player] of this.players) {
      if (player.socketId === socketId) return player;
    }
    return null;
  }

  updateSocketId(uid, newSocketId) {
    const player = this.players.get(uid);
    if (player) player.socketId = newSocketId;
  }

  recordAnswer(uid, questionIndex, answerIndex) {
    const player = this.players.get(uid);
    if (!player) return false;
    if (player.answers.has(questionIndex)) return false;

    player.answers.set(questionIndex, answerIndex);
    
    const question = player.questions[questionIndex];
    if (question && answerIndex === question.correct) {
      player.score++;
    }
    
    player.currentQ = questionIndex + 1;
    
    if (player.currentQ >= player.questions.length) {
      player.status = "finished";
    }
    
    return true;
  }

  getPlayerCount() {
    return this.players.size;
  }

  getActivePlayerCount() {
    let count = 0;
    this.players.forEach(p => {
      if (p.status !== "left") count++;
    });
    return count;
  }

  start() {
    this.status = "active";
    this.startTime = Date.now();
    this.endTime = this.startTime + this.contestDuration;
  }

  end() {
    this.status = "ended";
  }

  canJoin() {
    if (this.status === "waiting") return true;
    if (this.status === "ended") return false;
    if (this.isRematch) return false; // No new entries to rematch
    
    const now = Date.now();
    const timeLeft = this.endTime - now;
    return timeLeft >= this.gameDuration;
  }

  getTimeLeft() {
    if (this.status !== "active") return null;
    const left = this.endTime - Date.now();
    return Math.max(0, left);
  }

  getFinalScores() {
    const scores = [];
    this.players.forEach((player, uid) => {
      scores.push({
        uid,
        socketId: player.socketId,
        name: player.name,
        score: player.score,
        status: player.status,
        questionsAnswered: player.answers.size
      });
    });
    return scores.sort((a, b) => b.score - a.score);
  }

  getLiveLeaderboard() {
    return this.getFinalScores();
  }

  findWinners() {
    const scores = this.getFinalScores();
    if (scores.length === 0) return [];
    const topScore = scores[0].score;
    return scores.filter(p => p.score === topScore);
  }
}

module.exports = Contest;