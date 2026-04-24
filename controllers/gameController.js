let game = {
  multiplier: 1,
  crashPoint: 2,
  flying: false,
  players: []
};

// GENERATE CRASH (SECURE)
function generateCrash(){
  const r = Math.random();
  if(r < 0.3) return 1 + Math.random();
  if(r < 0.6) return 2 + Math.random()*2;
  return 5 + Math.random()*10;
}

// GAME LOOP
setInterval(() => {

  if(!game.flying){
    game.multiplier = 1;
    game.crashPoint = generateCrash();
    game.flying = true;
    game.players = [];
    return;
  }

  game.multiplier += 0.02 + game.multiplier*0.003;

  if(game.multiplier >= game.crashPoint){
    game.flying = false;
  }

}, 100);


// ========== CONTROLLERS ==========

// STATE
exports.getGameState = (req,res)=>{
  res.json({
    multiplier: game.multiplier,
    flying: game.flying,
    crashed: !game.flying,
    crashPoint: game.crashPoint
  });
};

// BET
exports.placeBet = (req,res)=>{
  const { amount, autoCashout } = req.body;

  game.players.push({
    user: req.user.id,
    amount,
    autoCashout,
    cashed: false
  });

  res.json({ success:true });
};

// CASHOUT
exports.cashOut = (req,res)=>{
  const player = game.players.find(p => p.user === req.user.id);

  if(!player || player.cashed){
    return res.status(400).json({ message:"Already cashed" });
  }

  if(!game.flying){
    return res.status(400).json({ message:"Game crashed" });
  }

  player.cashed = true;

  const win = player.amount * game.multiplier;

  // 👉 UPDATE DB HERE
  // await User.findByIdAndUpdate(...)

  res.json({
    multiplier: game.multiplier,
    win
  });
};

const GameRound = require("../models/GameRound");

exports.history = async (req,res)=>{
  const rounds = await GameRound.find().sort({ createdAt: -1 }).limit(20);
  res.json(rounds);
};