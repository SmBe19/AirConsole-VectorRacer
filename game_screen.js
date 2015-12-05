var airconsole;
var waitEl;
var canvBg;
var canvFg

var raceMaps;

var raceMap;
var raceMapSize;
var raceMapStart;
var raceMapCheckpoints;

var game_running;
var players = [];
var bombs = [];
var timeUntilRound;
var playersInDest;
var activePlayers;

var mapChooser;

var STRIPES_COUNT = 6;
var TIME_PER_ROUND = 2000;
var START_WAIT_TIME = 10000;
var ROUND_TIME_UPDATE = 1000;
var DRAW_TIMEOUT = 100;

var BOMB_RADIUS = 3;
var FREEZER_RADIUS = 2;
var FREEZER_DURATION = 2;

function init(){
  waitEl = document.getElementById("wait");
  canvBg = document.getElementById("canvasBg");
  canvFg = document.getElementById("canvasFg");

  initCanvas(canvBg);
  initCanvas(canvFg);

  raceMaps = initRaceMaps();
  loadDefaultMap();

  setInterval(drawPlayers, DRAW_TIMEOUT);
  setInterval(maybePlayRound, ROUND_TIME_UPDATE);

  initConsole();

  game_running = false;

  // debug
  //debugInit();
}

function debugInit(){
  initPlayer(1);
  players[1].vx = 1;
  players[1].vy = 1;
  players[1].chvx = 1;

  bombs.push({"type": "bomb", "x": 5, "y": 5});
  bombs.push({"type": "freezer", "x": 15, "y": 5});

  game_running = true;
}

// *** AirConsole ***

function initConsole(){
  airconsole = new AirConsole();
  airconsole.onConnect = function(device_id) {
    var playerDeviceIds = airconsole.getControllerDeviceIds();
    airconsole.setActivePlayers(playerDeviceIds.length);
    waitEl.innerHTML = "";
    if(players[device_id] === undefined){
      initPlayer(device_id);
    } else {
      players[device_id].active = true;
    }
    activePlayers++;

    if(playerDeviceIds.length === 1){
      initMapChoosing();
    }
  };

  airconsole.onDisconnect = function(device_id){
    var playerDeviceIds = airconsole.getControllerDeviceIds();
    airconsole.setActivePlayers(playerDeviceIds.length);
    if(playerDeviceIds.length == 0){
      waitEl.innerHTML = "Waiting for players...";
      game_running = false;
    } else {
      if(device_id === mapChooser){
        initMapChoosing();
      }
    }
    activePlayers--;

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
        } else if(data.action == "loadMap"){
          loadMap(raceMaps[data.mapId]);
          mapChooser = false;
        }
      }
    }
  };

  airconsole.onCustomDeviceStateChange = function(device_id, custom_data){
    if(players[device_id] !== undefined){
      players[device_id].color = custom_data.color;
    }
  };

  airconsole.onDeviceStateChange = function(device_id, user_data){
  }
}

function initMapChoosing(){
  mapChooser = airconsole.convertPlayerNumberToDeviceId(0);
  if(mapChooser === undefined){
    mapChooser = false;
    return;
  }
  game_running = false;

  var data = [];
  for(var k in raceMaps){
    data.push(k);
  }

  airconsole.message(mapChooser, {"action": "chooseMap", "maps": data});
}

// *** Game ***
function loadDefaultMap(){
  loadMap(raceMaps["circle"]);
}

function loadMap(source){
  if(source.raceMapSize !== undefined){
    raceMap = source.raceMap;
    raceMapSize = source.raceMapSize;
  } else {
    raceMap = source.split("\n");
    raceMapSize = raceMap[0].split(" ");
    raceMap.shift();
  }

  players = [];
  raceMapCheckpoints = [];
  timeUntilRound = START_WAIT_TIME;
  playersInDest = 0;
  activePlayers = 0;
  var startPoints = [];
  mapChooser = false;
  game_running = true;

  for(var y = 0; y < raceMapSize[1]; y++){
    for(var x = 0; x < raceMapSize[0]; x++){
      if(raceMap[y][x] == '='){
        startPoints.push({"x": x, "y": y});
      }
      if(raceMap[y][x] != '#' && raceMap[y][x] != '.'){
        if(raceMapCheckpoints.indexOf(raceMap[y][x]) === -1){
          raceMapCheckpoints.push(raceMap[y][x]);
        }
      }
    }
  }

  raceMapStart = startPoints[Math.floor(startPoints.length / 2)];

  drawBackground();

  initDevicePlayers();

  if(airconsole !== undefined){
    airconsole.broadcast({"action": "mapLoaded"})
  }
}

function initDevicePlayers(){
  if(airconsole === undefined){
    return;
  }

  airconsole.getControllerDeviceIds().forEach(function(p){
    initPlayer(p);
    activePlayers++;
  });
}

function initPlayer(playerId){
  players[playerId] = {"x": raceMapStart.x, "y": raceMapStart.y, "vx" : 0, "vy" : 0,
    "chvx": 0, "chvy": 0, "bomb": false, "freezer": false, color: "red", "active": true,
    "won": false, "frozen": 0, "playerId": playerId, "rank": 0,
    "lastCheckpoint": raceMapStart, "visitedCheckpoints": {}};
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
  if(!game_running){
    return;
  }
  timeUntilRound -= ROUND_TIME_UPDATE;
  if(timeUntilRound <= 0){
    timeUntilRound = TIME_PER_ROUND;
    playRound();
  }
  waitEl.innerHTML = (timeUntilRound/1000) + "s";
}

function playRound(){
  bombs = [];
  players.forEach(function(p){
    if(!p.active || p.won){
      return;
    }

    if(p.bomb){
      bombs.push({"type": "bomb", "x": p.x, "y": p.y});
      p.bomb = false;
    }
    if(p.freezer){
      bombs.push({"type": "freezer", "x": p.x, "y": p.y});
      p.freezer = false;
    }

    if(p.frozen === 0){
      p.vx += p.chvx;
      p.vy += p.chvy;
    } else {
      p.frozen--;
    }
    p.x += p.vx;
    p.y += p.vy;

    var c = undefined;
    if(raceMap[p.y] !== undefined){
      c = raceMap[p.y][p.x];
    }
    if(c === undefined || c == '#'){
      p.vx = 0;
      p.vy = 0;
      p.x = p.lastCheckpoint.x;
      p.y = p.lastCheckpoint.y;
    } else if(c != '.'){
      p.lastCheckpoint = {"x": p.x, "y": p.y};
      p.visitedCheckpoints[c] = true;
      if(c == '$'){
        var isWinner = true;
        raceMapCheckpoints.forEach(function(e){
          if(p.visitedCheckpoints[e] !== true){
            isWinner = false;
          }
        });
        if(isWinner){
          p.won = true;
          playersInDest++;
          p.rank = playersInDest;
          airconsole.message(p.playerId, {"action": "won", "rank": p.rank});

          if(playersInDest === activePlayers && mapChooser === false){
            initMapChoosing();
          }
        }
      }
    }
  });

  bombs.forEach(function(b){
    players.forEach(function(p){
      if((b.type == "bomb" ? BOMB_RADIUS : FREEZER_RADIUS)
          >= Math.max(Math.abs(p.x-b.x), Math.abs(p.y-b.y))){
        if(b.type == "bomb"){
          p.vx = 0;
          p.vy = 0;
          airconsole.message(p.playerId, {"vibrate": 1000});
        } else if(b.type == "freezer"){
          p.frozen = FREEZER_DURATION;
          airconsole.message(p.playerId, {"vibrate": 1000});
        }
      }
    });
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

function zoomHelper(canv){
  var zoomX = canv.clientWidth / raceMapSize[0];
  var zoomY = canv.clientHeight / raceMapSize[1];

  // make everything square
  var offX = zoomX > zoomY ? (canv.clientWidth - raceMapSize[0]*zoomY) / 2 : 0;
  var offY = zoomY > zoomX ? (canv.clientHeight - raceMapSize[1]*zoomX) / 2 : 0;
  var zoom = Math.min(zoomX, zoomY);
  zoomX = zoomY = zoom;

  var cx = function(x){
    return (x+0.5)*zoomX + offX;
  }
  var cy = function(x){
    return (x+0.5)*zoomY + offY;
  }
  var dx = function(x){
    return x*zoomX;
  }
  var dy = function(x){
    return x*zoomY;
  }

  return {"cx": cx, "cy": cy, "dx": dx, "dy": dy};
}

function drawPlayers(){
  var g = canvFg.getContext("2d");
  var zh = zoomHelper(canvBg);

  g.clearRect(0, 0, canvFg.clientWidth, canvFg.clientHeight);

  players.forEach(function(p) {
    if(!p.active){
      return;
    }
    g.beginPath();
    g.strokeStyle = p.color;
    // circle
    g.lineWidth = 2;
    g.arc(zh.cx(p.x), zh.cy(p.y), Math.min(zh.dx(0.5), zh.dy(0.5)), 0, 2*Math.PI);
    g.stroke();
    // old path
    g.moveTo(zh.cx(p.x), zh.cy(p.y));
    g.lineTo(zh.cx(p.x - p.vx), zh.cy(p.y - p.vy));
    g.stroke();
    // possible positions
    for(var y = -1; y < 2; y++){
      for(var x = -1; x < 2; x++){
        g.beginPath();
        if((p.frozen === 0 && y == p.chvy && x == p.chvx) ||
            (p.frozen > 0 && y == 0 && x == 0)){
          g.strokeStyle = p.color;
          g.lineWidth = 2;
        } else {
          g.strokeStyle = "#CCCCCC";
          g.lineWidth = 1;
        }
        g.arc(zh.cx(p.x + p.vx + x), zh.cy(p.y + p.vy + y), Math.min(zh.dx(0.25), zh.dy(0.25)), 0, 2*Math.PI);
        g.stroke();
      }
    }
  });

  // bombs
  g.lineWidth = 2
  bombs.forEach(function(b){
    g.beginPath();
    var radius = 0;
    if(b.type == "bomb"){
      g.strokeStyle = "#FF0000";
      radius = BOMB_RADIUS;
    } else if(b.type == "freezer"){
      g.strokeStyle = "#0000FF";
      radius = FREEZER_RADIUS;
    }
    g.moveTo(zh.cx(b.x - radius), zh.cy(b.y));
    g.lineTo(zh.cx(b.x + radius), zh.cy(b.y));
    g.stroke();
    g.moveTo(zh.cx(b.x), zh.cy(b.y-radius));
    g.lineTo(zh.cx(b.x), zh.cy(b.y+radius));
    g.stroke();
    g.moveTo(zh.cx(b.x-radius/2), zh.cy(b.y-radius/2));
    g.lineTo(zh.cx(b.x+radius/2), zh.cy(b.y+radius/2));
    g.stroke();
    g.moveTo(zh.cx(b.x+radius/2), zh.cy(b.y-radius/2));
    g.lineTo(zh.cx(b.x-radius/2), zh.cy(b.y+radius/2));
    g.stroke();
  });
}

function drawBackground(){
  var g = canvBg.getContext("2d");
  var zh = zoomHelper(canvBg);

  g.clearRect(0, 0, canvBg.clientWidth, canvBg.clientHeight);

  g.beginPath();
  for(var y = 0; y < raceMapSize[1]; y++){
    for(var x = 0; x < raceMapSize[0]; x++){
      if(raceMap[y][x] != '#'){
        g.fillStyle = "transparent";
        if(raceMap[y][x] == '$'){
          g.fillStyle = "#FAA";
        } else if(raceMap[y][x] == '='){
          g.fillStyle = "#AFA";
        } else if(raceMap[y][x] != '.'){
          g.fillStyle = "#FFA";
        }
        if(raceMap[y][x] != '.'){
          g.fillRect(zh.cx(x-0.5), zh.cy(y-0.5), zh.dx(1), zh.dy(1));
        }
        g.moveTo(zh.cx(x), zh.cy(y-0.5));
        g.lineTo(zh.cx(x), zh.cy(y+0.5));
        g.stroke();
        g.moveTo(zh.cx(x-0.5), zh.cy(y));
        g.lineTo(zh.cx(x+0.5), zh.cy(y));
        g.stroke();
      } else {
        for(var i = 0; i < STRIPES_COUNT; i++){
          if(i <= STRIPES_COUNT / 2){
            g.moveTo(zh.cx(x + 0.5 - 2*i/STRIPES_COUNT), zh.cy(y+0.5));
            g.lineTo(zh.cx(x + 0.5), zh.cy(y + 0.5 - 2*i/STRIPES_COUNT));
            g.stroke();
          } else {
            g.moveTo(zh.cx(x - 0.5), zh.cy(y + 1.5 - 2*i/STRIPES_COUNT));
            g.lineTo(zh.cx(x + 1.5 - 2*i/STRIPES_COUNT), zh.cy(y - 0.5));
            g.stroke();
          }
        }
      }
    }
  }
}
