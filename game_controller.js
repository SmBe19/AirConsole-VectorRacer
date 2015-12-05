var airconsole;
var playerIdEl;
var analogEl;

var downPos;
var upPos;

function initConsole(){
  airconsole = new AirConsole({"orientation": "landscape"});

  airconsole.onActivePlayersChange = function(player){
    if(player !== undefined){
      playerIdEl.innerHTML = ("Player " + player);
    } else {
      playerIdEl.innerHTML = "Game is full";
    }
  }
}

function init(){
  initConsole();

  playerIdEl = document.getElementById("player_id");
  analogEl = document.getElementById("analog");
}

function plantBomb(){
  airconsole.message(AirConsole.SCREEN, {"action": "bomb"});
}

function plantFreezer(){
  airconsole.message(AirConsole.SCREEN, {"action": "freezer"});
}

function touchStart(ev){
  downPos = {"x": ev.clientX, "y": ev.clientY};
}

function touchEnd(ev, isMove){
  if(downPos === undefined){
    return;
  }
  upPos = {"x": ev.clientX, "y": ev.clientY};

  var getDir = function(x, size){
    return Math.abs(x) > size / 6 ? (x < 0 ? -1 : 1) : 0;
  }

  data = {"action": "move", "x": getDir(upPos.x - downPos.x, analogEl.clientWidth),
    "y": getDir(upPos.y - downPos.y, analogEl.clientHeight)};

  if(!isMove){
    downPos = undefined;
  }

  airconsole.message(AirConsole.SCREEN, data);
}
