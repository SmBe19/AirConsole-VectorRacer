var airconsole;
var waitEl;
var canvBg;
var canvFg
var raceMap;
var raceMapSize;
var raceMapStart;
var players = [];
var timeUntilRound;

var STRIPES_COUNT = 6;
var TIME_PER_ROUND = 5000;
var ROUND_TIME_UPDATE = 1000;

function init(){
  waitEl = document.getElementById("wait");
  canvBg = document.getElementById("canvasBg");
  canvFg = document.getElementById("canvasFg");

  loadDefaultMap();

  initCanvas(canvBg);
  initCanvas(canvFg);

  drawBackground();

  setInterval(drawPlayers, 100);
  setInterval(maybePlayRound, ROUND_TIME_UPDATE);

  initConsole();
}

// *** AirConsole ***

function initConsole(){
  airconsole = new AirConsole();
  airconsole.onConnect = function(device_id) {
    var playerDeviceIds = airconsole.getControllerDeviceIds();
    airconsole.setActivePlayers(playerDeviceIds.length);
    waitEl.innerHTML = "";
    if(players[device_id] === undefined){
      players[device_id] = {"x": raceMapStart.x, "y": raceMapStart.y, "vx" : 0, "vy" : 0,
        "chvx": 0, "chvy": 0, "bomb": false, "freezer": false, color: "red", "active": true};
    } else {
      players[device_id].active = true;
    }
    console.log(players);
    drawPlayers();
  };

  airconsole.onDisconnect = function(device_id){
    var playerDeviceIds = airconsole.getControllerDeviceIds();
    airconsole.setActivePlayers(playerDeviceIds.length);
    if(playerDeviceIds.length == 0){
      waitEl.innerHTML = "Waiting for players...";
    }

    if(players[device_id] !== undefined){
      players[device_id].active = false;
    }
  };

  airconsole.onMessage = function(device_id, data){
    if(players[device_id] !== undefined){
      console.log(data);
      if(data.action !== undefined){
        if(data.action == "move"){
          move(device_id, data);
        } else if (data.action == "bomb") {
          plantBomb(device_id);
        } else if(data.action == "freezer"){
          plantFreezer(device_id);
        }
      }
    }
  }
}

// *** Game ***
function loadDefaultMap(){
  loadMap("20 20\n#######.$$==.#######\n#####...$$==...#####\n###.....$$==.....###\n##......$$==......##\n##......$##=......##\n#......######......#\n#.....########.....#\n.....##########.....\n.....##########.....\n....############....\n....############....\n.....##########.....\n.....##########.....\n#.....########.....#\n#......######......#\n##......a##a......##\n##......aaaa......##\n###.....aaaa.....###\n#####...aaaa...#####\n#######.aaaa.#######")
}

function loadMap(source){
  raceMap = source.split("\n");
  raceMapSize = raceMap[0].split(" ");
  raceMap.shift();

  players = [];
  timeUntilRound = TIME_PER_ROUND;

  for(var y = 0; y < raceMapSize[1]; y++){
    for(var x = 0; x < raceMapSize[0]; x++){
      if(raceMap[y][x] == '='){
        raceMapStart = {"x": x, "y": y};
        y = raceMapSize[1];
        break;
      }
    }
  }
}

function move(player, direction){
  if(players[player] !== undefined){
    players[player].chvx = direction.x;
    players[player].chvy = direction.y;
  }
}

function plantBomb(player){
  if(players[player] !== undefined){
    players[player].bomb = true;
  }
}

function plantFreezer(player){
  if(players[player] !== undefined){
    players[player].freezer = true;
  }
}

function maybePlayRound(){
  timeUntilRound -= ROUND_TIME_UPDATE;
  if(timeUntilRound <= 0){
    timeUntilRound = TIME_PER_ROUND;
    playRound();
  }
  waitEl.innerHTML = (timeUntilRound/1000) + "s";
}

function playRound(){
  players.forEach(function(p){
    if(!p.active){
      return;
    }

    p.vx += p.chvx;
    p.vy += p.chvy;
    p.x += p.vx;
    p.y += p.vy;

    p.chvx = 0;
    p.chvy = 0;
  });
}

// *** Drawing ***

function initCanvas(canv){
  var g = canv.getContext("2d");
  canv.width = canv.clientWidth;
  canv.height = canv.clientHeight;
  g.fillStyle = "black";
  g.clearRect(0, 0, canv.width, canv.height);
}

function drawPlayers(){
  var g = canvFg.getContext("2d");
  var zoomX = canvFg.clientWidth / raceMapSize[0];
  var zoomY = canvFg.clientHeight / raceMapSize[1];

  var cx = function(x){
    return (x+0.5)*zoomX;
  }
  var cy = function(x){
    return (x+0.5)*zoomY;
  }

  g.clearRect(0, 0, canvFg.clientWidth, canvFg.clientHeight);

  players.forEach(function(p) {
    if(!p.active){
      return;
    }
    g.beginPath();
    g.strokeStyle = p.color;
    g.arc(cx(p.x), cy(p.y), Math.min(cx(0), cy(0)), 0, 2*Math.PI);
    g.stroke();
    g.moveTo(cx(p.x), cy(p.y));
    g.lineTo(cx(p.x - p.vx), cy(p.y - p.vy));
    g.stroke();
    g.moveTo(cx(p.x), cy(p.y))
    g.lineTo(cx(p.x + p.vx + p.chvx), cy(p.y + p.vy + p.chvy));
    g.stroke();
  });
}

function drawBackground(){
  var g = canvBg.getContext("2d");
  var zoomX = canvBg.clientWidth / raceMapSize[0];
  var zoomY = canvBg.clientHeight / raceMapSize[1];

  var cx = function(x){
    return (x+0.5)*zoomX;
  }
  var cy = function(x){
    return (x+0.5)*zoomY;
  }

  g.clearRect(cx(-0.5), cy(-0.5), cx(99.5), cy(99.5));

  for(var y = 0; y < raceMapSize[1]; y++){
    for(var x = 0; x < raceMapSize[0]; x++){
      if(raceMap[y][x] != '#'){
        g.fillStyle = "transparent";
        if(raceMap[y][x] == '$'){
          g.fillStyle = "red";
        } else if(raceMap[y][x] == '='){
          g.fillStyle = "green";
        } else if(raceMap[y][x] != '.'){
          g.fillStyle = "yellow";
        }
        if(raceMap[y][x] != '.'){
          g.fillRect(cx(x-0.5), cy(y-0.5), cx(0.5), cy(0.5));
        }
        g.moveTo(cx(x), cy(y-0.5));
        g.lineTo(cx(x), cy(y+0.5));
        g.stroke();
        g.moveTo(cx(x-0.5), cy(y));
        g.lineTo(cx(x+0.5), cy(y));
        g.stroke();
      } else {
        for(var i = 0; i < STRIPES_COUNT; i++){
          if(i <= STRIPES_COUNT / 2){
            g.moveTo(cx(x + 0.5 - 2*i/STRIPES_COUNT), cy(y+0.5));
            g.lineTo(cx(x + 0.5), cy(y + 0.5 - 2*i/STRIPES_COUNT));
            g.stroke();
          } else {
            g.moveTo(cx(x - 0.5), cy(y + 1.5 - 2*i/STRIPES_COUNT));
            g.lineTo(cx(x + 1.5 - 2*i/STRIPES_COUNT), cy(y - 0.5));
            g.stroke();
          }
        }
      }
    }
  }
}
