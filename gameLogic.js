const QUESTION_TIME = 20;

class GameRoom {
  constructor(roomId, roomData, questions) {
    this.roomId = roomId;
    this.roomData = roomData;
    this.questions = questions;
    this.players = new Map();
    this.currentQuestion = 0;
    this.gameStarted = false;
    this.tiebreakerMode = false;
    this.timer = null;
    this.answers = new Map();
    this.scores = new Map();
    this.answeredCount = 0;
  }

  addPlayer(socketId, playerData) {
    this.players.set(socketId, playerData);
    this.scores.set(socketId, 0);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.scores.delete(socketId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  recordAnswer(socketId, answerIndex) {
    if (this.answers.has(socketId)) return false;
    this.answers.set(socketId, answerIndex);
    this.answeredCount++;
    return true;
  }

  allPlayersAnswered() {
    return this.answeredCount >= this.players.size;
  }

  processAnswers() {
    const currentQ = this.questions[this.currentQuestion];
    const results = new Map();

    this.players.forEach((player, socketId) => {
      const answer = this.answers.get(socketId);
      const isCorrect = answer === currentQ.correct;
      if (isCorrect) {
        this.scores.set(socketId, (this.scores.get(socketId) || 0) + 1);
      }
      results.set(socketId, {
        answer: answer !== undefined ? answer : -1,
        correct: isCorrect,
        score: this.scores.get(socketId) || 0
      });
    });

    return results;
  }

  getScores() {
    const scoreList = [];
    this.players.forEach((player, socketId) => {
      scoreList.push({
        socketId,
        name: player.name,
        score: this.scores.get(socketId) || 0
      });
    });
    return scoreList.sort((a, b) => b.score - a.score);
  }

  findWinners() {
    const scores = this.getScores();
    if (scores.length === 0) return [];
    const topScore = scores[0].score;
    return scores.filter(p => p.score === topScore);
  }

  nextQuestion() {
    this.currentQuestion++;
    this.answers = new Map();
    this.answeredCount = 0;
  }

  hasMoreQuestions() {
    return this.currentQuestion < this.questions.length - 1;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestion];
  }
}

module.exports = GameRoom;