var airconsole;
var playerIdEl;
var analogEl;
var wonElText;
var wonEl;
var mapchooseEl;
var mapchooseListEl;

var downPos;
var upPos;
var touchId;

var isTouchCapable;

var ANALOG_SIZE = 200;

navigator.vibrate = (navigator.vibrate ||
                     navigator.webkitVibrate ||
                     navigator.mozVibrate ||
                     navigator.msVibrate);

function initConsole(){
  airconsole = new AirConsole({"orientation": "landscape"});

  airconsole.onActivePlayersChange = function(player){
    if(player !== undefined){
      playerIdEl.innerHTML = ("Player " + player);
    } else {
      playerIdEl.innerHTML = "Game is full";
    }
  };

  airconsole.onMessage = function(from, data){
    if(from == AirConsole.SCREEN){
      console.log(data);
      if(data.vibrate){
        navigator.vibrate(data.vibrate);
      }
      if(data.action !== undefined){
        if(data.action == "won"){
          wonTextEl.innerHTML = "You are on rank " + data.rank + "!";
          wonEl.hidden = false;
        } else if(data.action == "chooseMap"){
          fillMapList(data.maps);
        } else if(data.action == "mapLoaded"){
          mapchooseEl.hidden = true;
        }
      }
    }
  };

  airconsole.onReady = function(){
    var custom = airconsole.getCustomDeviceState(airconsole.getDeviceId());
    if(custom !== undefined && custom.choosingMaps !== undefined){
      fillMapList(custom.choosingMaps);
    }
  };
}

function fillMapList(maps){
  while(mapchooseListEl.firstChild){
    mapchooseListEl.removeChild(mapchooseListEl.firstChild);
  }
  maps.forEach(function(m){
    var newEl = document.createElement("p");
    newEl.innerHTML = m;
    newEl.classList.add("mapchoose_element");
    newEl.addEventListener("click", function(){
      airconsole.message(AirConsole.SCREEN, {"action": "loadMap", "mapId": m});
      mapchooseEl.hidden = true;
      airconsole.setCustomDeviceStateProperty("choosingMaps", undefined);
    });
    mapchooseListEl.appendChild(newEl);
  });
  mapchooseEl.hidden = false;
  airconsole.setCustomDeviceStateProperty("choosingMaps", maps);
}

function init(){
  initConsole();

  playerIdEl = document.getElementById("player_id");
  analogEl = document.getElementById("analog");
  wonTextEl = document.getElementById("wonmessage_text");
  wonEl = document.getElementById("wonmessage");
  mapchooseEl = document.getElementById("mapchoose");
  mapchooseListEl = document.getElementById("mapchoose_list");

  wonEl.hidden = true;
  mapchooseEl.hidden = true;
}

function chooseColor(element, isTouch){
  if(isTouch){
    isTouchCapable = true;
  }

  var bgcolor = getComputedStyle(element, "").backgroundColor;
  var vgcolor = getComputedStyle(element, "").color;

  airconsole.setCustomDeviceStateProperty("color", bgcolor);
  document.getElementById("welcome").hidden = true;
  analogEl.style.background = bgcolor;
  analogEl.style.color = vgcolor;
  playerIdEl.style.color = vgcolor;
  wonEl.style.background = bgcolor;
  wonTextEl.style.color = vgcolor;
}

function plantBomb(isTouch){
  if(isTouchCapable && !isTouch){
    return;
  }
  airconsole.message(AirConsole.SCREEN, {"action": "bomb"});
}

function plantFreezer(isTouch){
  if(isTouchCapable && !isTouch){
    return;
  }
  airconsole.message(AirConsole.SCREEN, {"action": "freezer"});
}

function touchStart(ev, isTouch){
  if(isTouchCapable && !isTouch){
    return;
  }
  if(ev.touches !== undefined){
    if(touchId !== undefined || ev.targetTouches.length < 1){
      return;
    }
    var touch = ev.targetTouches.item(0);
    touchId = touch.identifier;
    downPos = {"x": touch.screenX, "y": touch.screenY};
  } else {
    downPos = {"x": ev.clientX, "y": ev.clientY};
  }
}

function touchMove(ev, isTouch){
  if(isTouchCapable && !isTouch){
    return;
  }
  if(downPos === undefined){
    return;
  }
  if(ev.touches !== undefined){
    upPos = undefined;
    for(var i = 0; i < ev.touches.length; i++){
      if(ev.touches.item(i).identifier === touchId){
        upPos = {"x": ev.touches.item(i).screenX, "y": ev.touches.item(i).screenY};
      }
    }
    if(upPos === undefined){
      return;
    }
  } else {
    upPos = {"x": ev.clientX, "y": ev.clientY};
  }

  var getDir = function(x, size){
    return Math.abs(x) > size / 6 ? (x < 0 ? -1 : 1) : 0;
  }

  var data = {"action": "move", "x": getDir(upPos.x - downPos.x, ANALOG_SIZE),
    "y": getDir(upPos.y - downPos.y, ANALOG_SIZE)};

  airconsole.message(AirConsole.SCREEN, data);
}

function touchEnd(isTouch){
  if(isTouchCapable && !isTouch){
    return;
  }
  downPos = undefined;
  touchId = undefined;

  var data = {"action": "move", "x": 0, "y": 0};
  airconsole.message(AirConsole.SCREEN, data);
}
