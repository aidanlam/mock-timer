
// ------------------------------------------------
// --- Initialize Firebase

var config = {
    apiKey: "AIzaSyDGm7xzclJ6zcdBmD6ulP4XeBRVqS-4lO0",
    authDomain: "timer-13cf1.firebaseapp.com",
    databaseURL: "https://timer-13cf1.firebaseio.com",
    storageBucket: "timer-13cf1.appspot.com",
    messagingSenderId: "250516528819"
};

firebase.initializeApp(config);
var database = firebase.database();
var data;

// ------------------------------------------------
// --- Intervals

var normalIntervalTimerUpdateMS      =  200;
var intervalTimerUpdateMS            = normalIntervalTimerUpdateMS;
var thresholdTimerForceSkewUpdateMS  = 400;

// ------------------------------------------------
// --- Parse the URL

//var pathElements = document.location.pathname.split("/");
//var basePath     = "/" + pathElements[1] + "/";


var pathElements = document.location.pathname.split("/");
var lastPathElement = pathElements.pop();
var basePath = pathElements.join("/");

var params = new URLSearchParams(document.location.search.substring(1));
var paramCode = params.get("code");

var argElements = lastPathElement.split("-");
if (paramCode && paramCode.length) {
  argElements = paramCode.split("-");
  basePath = document.location.pathname + "?code=";
} else {
  basePath += "/";
}

console.log(pathElements);
console.log(argElements);
console.log(basePath);

//var eventElements = pathElements[2].split("-");

var eventName     = argElements.shift();

var enReSync     = argElements.indexOf("resync")>=0;
var enSound      = argElements.indexOf("s")>=0;
var enTod        = argElements.indexOf("tod")>=0;
var enSlot       = argElements.indexOf("slot")>=0;
var enDbg        = argElements.indexOf("dbg")>=0;
var enSimple     = argElements.indexOf("simple")>=0;
var isAdmin      = false;
function log_args() {
  console.log(eventName 
    +" isAdmin="+isAdmin 
    +" enSound="+enSound 
    );
}
log_args();

var enLogo       = ! enSimple;
var enCaption    = ! enSimple;
var enHeader     = ! enSimple;


var baseURL = document.location.origin + basePath ;

console.log("baseURL="+baseURL);

function setIsAdmin() {
  var apw="not/ever";
  if (data && data.password) {
    apw = data.password;
  }
  var newIsAdmin = argElements.indexOf("p"+apw)>=0;
  if (newIsAdmin != isAdmin) {
    isAdmin=newIsAdmin;
    log_args();
  }
}

// ------------------------------------------------
// --- Deal with Javascript object comparison

Object.compare_equiv = function (obj1, obj2) {
	//Loop through properties in object 1
	for (var p in obj1) {
		//Check property exists on both objects
		if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
 
		switch (typeof (obj1[p])) {
			//Deep compare objects
			case 'object':
				if (!Object.compare_equiv(obj1[p], obj2[p])) return false;
				break;
			//Compare function code
			case 'function':
				if (typeof (obj2[p]) == 'undefined' || (p != 'compare_equiv' && obj1[p].toString() != obj2[p].toString())) return false;
				break;
			//Compare values
			default:
				if (obj1[p] != obj2[p]) return false;
		}
	}
 
	//Check object 2 for any extra properties
	for (var p in obj2) {
		if (typeof (obj1[p]) == 'undefined') return false;
	}
	return true;
};

// ------------------------------------------------
// Helper routines


function mssStr(secs) {
  return Math.floor(secs/60) + ":" + twoDigitStr(secs % 60);
}

function twoDigitStr(v) {
  return ((v<10) ? "0" : "") + v;
}

function getTimeOfDayStr () {
  var requiredDate=getTimeZoneTimeObj(data.tzOffset*60)
  var hours=requiredDate.h;
  var minutes=requiredDate.m;
  var seconds=requiredDate.s;
  var amPM="pm";
  if (hours<12) amPM="am";
  if (hours>12) hours=hours-12;
  if (hours==0) hours=12;
  if (minutes<=9) minutes="0"+minutes;
  if (seconds<=9) seconds="0"+seconds;

  var currentTime=hours+":"+minutes+amPM;
  return currentTime;
}

function getTimeZoneTimeObj(timeZoneOffsetminutes){
  var localdate = new Date()
  var timeZoneDate = new Date(localdate.getTime() + ((localdate.getTimezoneOffset() + timeZoneOffsetminutes)*60*1000));
  return {'h':timeZoneDate.getHours(),'m':timeZoneDate.getMinutes(),'s':timeZoneDate.getSeconds()};
}


// ------------------------------------------------

var timerId;

// ------------------------------------------------
// --- Event processing

function processEvent() {
  if (data == null) {
    clearTimerDOM();
  } else {
    data.tzOffset = (data.tzOffset == undefined) ?  0 : data.tzOffset;
    data.headText = (data.headText == undefined) ? "" : data.headText;
    updateConfigDOM();
    if (data.start) {
      runTimer(0);
    } else {
      window.clearTimeout(timerId);
      clearTimerDOM();
    }
    //console.log(data)
  }
  setIsAdmin();
  document.getElementById("admin").style.display = isAdmin ? "block" : "none";
  setupListeners();
}

function getAndProcessEvent(){
  return firebase.database().ref('event/' + eventName).once('value').then(function(snapshot){
    data = snapshot.val();
    processEvent();
  });
};
var eventInfo = firebase.database().ref('event/' + eventName);
eventInfo.on('value', function(snapshot) {
  data = snapshot.val();
  processEvent();
});




// ------------------------------------------------
// --- Clock Skew Processing

// TODO:
// asdfasf

var skewCurrentInterval    = 50000;

var skewSampleInterval      = 2000;
var skewSampleCount         = 6;
var skewSampleMaxStdDev     = 10;
var skewDriftSampleInterval = 50000;

var skewDebugStr     = "";

var skewVld          = 0;
var skewAvgVld       = 0;
var skewAvgArray     = [];
var skewAvgCount     = 0;
var skewCurrentMS    = 0;

var skewSlowAlpha    = 0.10;
var skewSlowIirMS    = 0;

var skewBadThreshMS    = 100;
var skewBadCount       = 0;
var skewBadCountLife   = 0;
var skewBadCountThresh = 2;

var skewDriftArray         = [];
var skewDriftArrayMin      = 6;
var skewDriftArrayMax      = 999;
var skewDriftTimeMinMS     = 1000000; // 1000s
var skewDriftArrayDecayMin = 1+skewDriftArrayMin;
var skewDriftArrayDecayMod = 4;
var skewDriftCurrentPPM    = 0;
var skewDriftCurrentVld    = 0;
var skewDriftCount         = 0;
var skewDriftDebugStr      = "";

var skewTimeStamp       = 0;
var skewPrevTimeStamp   = 0;

// --- Recheck/Restart

function recheckSkewCalcs() {
  skewCurrentInterval = skewSampleInterval;
}

function restartSkewCalcs() {
  skewVld    = 0;
  skewCurrentInterval = skewSampleInterval;
  skewAvgArray   = [];
  skewDriftArray = [];
}

restartSkewCalcs();

// --- Return current "time"

function timeSinceLastSkewCalc(tMS) {
  return ( (skewTimeStamp>0) ? (tMS-skewTimeStamp) : 0);
}

function nowAdjustedForSkewMS() {
  var tMS = Date.now();
  var driftMS = timeSinceLastSkewCalc(tMS)*skewDriftCurrentPPM/1000000;
  return (tMS + skewCurrentMS + driftMS);
}

// --- Math helper functions

function arrayMean (a) {
  var sum = 0;
  a.forEach(function (item, index, array) {
    sum += item.skew;
  });
  var mean = (a.length>0) ? Math.round(sum / a.length) : 0;
  return mean;
}
function arrayStdDev (a) {
  var varSum = 0;
  var mean = arrayMean(a);
  a.forEach(function (item, index, array) {
    varSum += Math.pow(Math.abs(mean-item.skew) , 2);
  });
  var stdDev = Math.round( Math.sqrt( (a.length>0) ? Math.round(varSum / a.length) : 0 ) * 10 ) / 10;
  return(stdDev);
}

function arraySlope(a) {
    // from https://dracoblue.net/dev/linear-least-squares-in-javascript/
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var count = 0;

    var x = 0;
    var y = 0;
    var values_length = a.length;

    if (values_length < 2) {
        return 0;
    }

    // Calculate the sum for each of the parts necessary.
    for (var v = 0; v < values_length; v++) {
        x = a[v].ts;
        y = a[v].skew;
        sum_x += x;
        sum_y += y;
        sum_xx += x*x;
        sum_xy += x*y;
        count++;
    }

    // calc m and b
    var m = (count*sum_xy - sum_x*sum_y) / (count*sum_xx - sum_x*sum_x);
    var b = (sum_y/count) - (m*sum_x)/count;

    // return the slop
    // TODO: should consider using both m and b to determine a better approximation for current skew value?
    return m;
}

// --- Calc Drift (PPM)

function calcDrift(skewAvgMS, skewAvgTimeStamp) {

  if (skewDriftArray.length == 0) {
    skewDriftCount = 0;
  }

  var obj={};
  obj.ts    = skewAvgTimeStamp;
  obj.skew  = skewAvgMS;
  obj.drift = 0;
  skewDriftArray.push(obj);
  while (skewDriftArray.length > skewDriftArrayMax) { skewDriftArray.shift(); }
  //console.log(skewDriftArray);
  skewDriftCount++;

  // slowly bleed off really old data
  if ( (skewDriftArray.length >= skewDriftArrayDecayMin) && ((skewDriftCount % skewDriftArrayDecayMod)==0) ) {
    console.log("pruning the skewDriftArray");
    skewDriftArray.shift();
  }

  if (skewDriftArray.length >= skewDriftArrayMin) {
    var skewDriftArrayTimeLenMS = (skewDriftArray[skewDriftArray.length-1].ts - skewDriftArray[0].ts);
    if (skewDriftArrayTimeLenMS > skewDriftTimeMinMS) {
      skewDriftCurrentPPM = Math.round(1000000 * arraySlope(skewDriftArray));
      console.log("");
      console.log("--- Set Drift to "+skewDriftCurrentPPM);
      console.log("");
      skewDriftArray[skewDriftArray.length-1].drift = skewDriftCurrentPPM;
      skewDriftCurrentVld = 1;
    }
  }


  skewDriftDebugStr = "";
  skewDriftDebugStr += "<BR/>skewDrift |";
  if (skewDriftCurrentVld) {
    skewDriftDebugStr += " *valid* |";
  }
  skewDriftDebugStr += String.format(" {0:0000}ppm",skewDriftCurrentPPM);
  skewDriftDebugStr += String.format(" | {0:00} {1:00}",skewDriftCount,skewDriftArray.length);
  skewDriftDebugStr += " |";
  var modFactor = Math.round(skewDriftArray.length/8);
  skewDriftArray.forEach(function (item, index, array) {
    var at_end = (index == (skewDriftArray.length-1));
    if ( index < 2 || index > (skewDriftArray.length-4) || ( index % modFactor ) == 0 ) {
      skewDriftDebugStr += String.format("&nbsp;&nbsp;&nbsp;{0:0}s",Math.round((item.ts-skewAvgTimeStamp)/1000));
      if (at_end) {
        skewDriftDebugStr += String.format(" {0:00.000}s ",item.skew/1000);
      } else {
        skewDriftDebugStr += String.format(" {0:0}ms ",item.skew-skewAvgMS);
      }
      skewDriftDebugStr += String.format(" {0:0}",item.drift);
      if (at_end) {
      skewDriftDebugStr += "ppm ";
      }
    } else {
      if ((index % modFactor ) == 1) {
        skewDriftDebugStr += "..";
      }
    }
  });
  skewDriftDebugStr += " |";

}

// --- Calc Skew (MS)

function calcAvgSkew(skewSampleMS) {
  skewTimeStamp=Date.now();
  skewDebugStr="";

  if (skewVld) {
    var skewError = skewSlowIirMS - skewSampleMS;
    if (Math.abs(skewError) >= skewBadThreshMS) {
      skewBadCount++;
      skewBadCountLife++;
      console.log(String.format("Large Skew Error: {0:0}ms ( {1:0} - {2:0} )  bcnt:{3:0} lcnt:{4,0}",skewError,skewSlowIirMS,skewSampleMS,skewBadCount,skewBadCountLife));
    } else if (skewBadCount>0) {
      skewBadCount--;
      console.log(String.format("Ok    Skew Error: {0:0}ms ( {1:0} - {2:0} )  bcnt:{3:0} lcnt:{4,0}",skewError,skewSlowIirMS,skewSampleMS,skewBadCount,skewBadCountLife));
    }
  }
  if (skewBadCount >= skewBadCountThresh) {
    console.log("Restarting Skew Calcs");
    restartSkewCalcs();
  }
  //skewDebugStr += " bcnt=" + skewBadCount + " lcnt=" + skewBadCountLife + " |";

  if (skewAvgVld) {
      skewCurrentInterval = skewSampleInterval;
      skewAvgArray=[];
      skewAvgVld=0;
  }
  if (skewAvgArray.length == 0) {
    skewAvgCount = 0;
  }

  

  var obj={};
  obj.ts  = skewTimeStamp;
  obj.skew = skewSampleMS;
  skewAvgArray.push(obj);
  while (skewAvgArray.length > skewSampleCount) { skewAvgArray.shift(); }
  //console.log(skewAvgArray);
  skewAvgCount++;

  var skewMeanMS   = arrayMean(skewAvgArray);
  var skewStdDevMS = arrayStdDev(skewAvgArray);
  var skewAvgTimeStamp = (skewAvgArray[0].ts + skewTimeStamp) / 2;
  if (skewAvgArray.length == skewSampleCount) {
    if (skewStdDevMS <= skewSampleMaxStdDev) {
      skewAvgVld = 1;
      skewCurrentInterval = skewDriftSampleInterval;
    } else {
      skewAvgVld = 0;
    }
  }

  skewDebugStr += "<BR/>skewAvg |";
  skewDebugStr += String.format(" {0:0}=vld",skewAvgVld);
  skewDebugStr += String.format(" | {0:00.000}s=mean",skewMeanMS/1000);
  skewDebugStr += String.format(" {0:0.000}s=stddev",skewStdDevMS/1000);
  skewDebugStr += String.format(" | {0:00}",skewAvgCount);
  skewDebugStr += " |";
  skewAvgArray.forEach(function (item, index, array) {
    skewDebugStr += String.format(" &nbsp;&nbsp; {0:00.000}",item.skew/1000);
  });
  skewDebugStr += " |";

  if ( ! skewVld) {
    skewSlowIirMS   = skewSampleMS;
    skewCurrentMS = skewSampleMS;
    skewAvgVld = 0;
  } else {
    skewSlowIirMS   = skewSlowAlpha * skewSampleMS + (1-skewSlowAlpha) * skewSlowIirMS;
    if (skewAvgVld) {
      skewCurrentMS    = skewMeanMS;
      calcDrift(skewCurrentMS,skewAvgTimeStamp);
    } else {
      skewCurrentMS   = skewSampleMS;
    }
  }
  skewVld    = 1;

  skewDebugStr += skewDriftDebugStr;

  skewPrevTimeStamp=skewTimeStamp;
}

// --- Calc Skew (MS)

var offsetRef = firebase.database().ref(".info/serverTimeOffset");
offsetRef.on("value", function(snap) {

  calcAvgSkew(snap.val());


  console.log(skewDebugStr);

  if (enDbg || isAdmin) {
    // ok
  } else {
    skewDebugStr="";
  }

});

// ------------------------------------------------
// --- Firebase offline/online to clear the cache of the clock skew info above

var reconnectID=0;
var reconnectTS=Date.now();

var connectedRef = firebase.database().ref(".info/connected");
connectedRef.on("value", function(snap) {
  if (snap.val() == true) {
    //console.log("firebase connected");
  } else {
    //console.log("firebase disconnected");
  }
});

function reconnectFirebase() {
  window.clearTimeout(reconnectID);
  //console.log("calling firebase.database().goOnline();");
  firebase.database().goOnline();
}


function flushFirebase(force) {
  if (force || ((Date.now()-reconnectTS) > skewCurrentInterval)) {
    reconnectTS = Date.now();
    //console.log("clearing firebase cache by going offline/online");
    //console.log("calling firebase.database().goOffline();");
    firebase.database().goOffline();
    reconnectID = window.setTimeout(reconnectFirebase,     1000);
  }
}

// ------------------------------------------------
// --- Update Config

function updateConfigCB(){
  var climbTime = document.getElementById("config_climb_time").value;
  var transTime = document.getElementById("config_trans_time").value;
  var tzOffset  = document.getElementById("config_tz_offset").value;
  var headText  = document.getElementById("config_head_text").value;
  firebase.database().ref('event/' + eventName).update({
    climbTime: parseInt(climbTime),
    transTime: parseInt(transTime),
    tzOffset:  parseFloat(tzOffset),
    headText:  headText
  }).then(function(e){ 
    getAndProcessEvent();
  });
};

function updateConfigDOM(){
  if (isAdmin) {
    document.getElementById("config_climb_time").value = data.climbTime;
    document.getElementById("config_trans_time").value = data.transTime;
    document.getElementById("config_tz_offset").value  = data.tzOffset;
    document.getElementById("config_head_text").value  = data.headText;
  }
};


// ------------------------------------------------
// --- Start / Stop Event

function startStopEventCB(val){
  firebase.database().ref('event/' + eventName).update({
    start: val
  }).then(getAndProcessEvent());
};

function startEventCB(){ console.log("starting event"); startStopEventCB(nowAdjustedForSkewMS()); };
function stopEventCB() { console.log("stopping event"); startStopEventCB(0); };

// ------------------------------------------------
// --- Rev / Fwd Events

var adjMs1 =   50;
var adjMs2 =  250;
var adjMs3 = 5000;

function revfwdEventCB(directionStr,deltaMs) {
  if (data.start) {
    console.log("startTime " + directionStr);
    startStopEventCB(data.start+deltaMs);
  } else {
    console.log("startTime " + directionStr + " ignored (not started)");
  }
}
function revEventCB(adjMs) { revfwdEventCB("rev",  adjMs); }
function fwdEventCB(adjMs) { revfwdEventCB("fwd",0-adjMs); }

// ------------------------------------------------
// --- Slot Adj Events

function adjSlotOffset(val) {
  console.log(val);
  startStopEventCB(data.start - 1000*val*(data.climbTime+data.transTime));
}
 
// ------------------------------------------------
// --- Type (once/cont) Events

function setOnceType(val) {
  console.log("OnceType: "+val);
  firebase.database().ref('event/' + eventName).update({
    onceType: val
  }).then(getAndProcessEvent());
}
 
// ------------------------------------------------
// --- Listeners

var setupListenersDone = false;

function setupListeners() {
  if (isAdmin && ! setupListenersDone) {
    var update_btn = document.getElementById("update_btn");
    var start_btn  = document.getElementById("start_btn");
    var stop_btn   = document.getElementById("stop_btn");
    var rev3_btn    = document.getElementById("rev3_btn");
    var rev2_btn    = document.getElementById("rev2_btn");
    var rev1_btn    = document.getElementById("rev1_btn");
    var fwd1_btn    = document.getElementById("fwd1_btn");
    var fwd2_btn    = document.getElementById("fwd2_btn");
    var fwd3_btn    = document.getElementById("fwd3_btn");
    update_btn.addEventListener("click", function(e){ updateConfigCB();   });
    start_btn.addEventListener ("click", function(e){ startEventCB();     });
    stop_btn.addEventListener  ("click", function(e){ stopEventCB();      });
    rev3_btn.addEventListener  ("click", function(e){ revEventCB(adjMs3); });
    rev2_btn.addEventListener  ("click", function(e){ revEventCB(adjMs2); });
    rev1_btn.addEventListener  ("click", function(e){ revEventCB(adjMs1); });
    fwd1_btn.addEventListener  ("click", function(e){ fwdEventCB(adjMs1); });
    fwd2_btn.addEventListener  ("click", function(e){ fwdEventCB(adjMs2); });
    fwd3_btn.addEventListener  ("click", function(e){ fwdEventCB(adjMs3); });
    setupListenersDone=true;
    console.log("setupListeners: done");
    rev3_btn.innerHTML=String.format("-{0}",adjMs3);
    rev2_btn.innerHTML=String.format("-{0}",adjMs2);
    rev1_btn.innerHTML=String.format("-{0}",adjMs1);
    fwd1_btn.innerHTML=String.format("+{0}",adjMs1);
    fwd2_btn.innerHTML=String.format("+{0}",adjMs2);
    fwd3_btn.innerHTML=String.format("+{0}",adjMs3);
    
    var slotm10_btn  = document.getElementById("slotm10_btn");
    var slotm01_btn  = document.getElementById("slotm01_btn");
    var slotp10_btn  = document.getElementById("slotp10_btn");
    var slotp01_btn  = document.getElementById("slotp01_btn");
    slotm10_btn.addEventListener("click", function(e){ adjSlotOffset(-10); });
    slotm01_btn.addEventListener("click", function(e){ adjSlotOffset( -1); });
    slotp10_btn.addEventListener("click", function(e){ adjSlotOffset(+10); });
    slotp01_btn.addEventListener("click", function(e){ adjSlotOffset( +1); });
    
    document.getElementById("type_cont").addEventListener("click", function(e) {setOnceType(0);});
    document.getElementById("type_once").addEventListener("click", function(e) {setOnceType(1);});
  }
}
// ------------------------------------------------
// --- Timer

function writeTimerDOM(iterationOddPhase,timeStr,timeColor,captionStr) {

  // --- Calculate some sizes
  var winWidth  = Math.min(window.innerWidth, window.innerHeight * 1.8);
  var timerMssFontSize      = Math.floor(winWidth/3.75);
  var timerCaptionFontSize  = Math.floor(winWidth/20);
  var timerHeadTextFontSize = Math.floor(winWidth/50);
  var logoSize              = 2*timerCaptionFontSize;

  // --- how long since last skew calc
  var secsSinceLastSkewCalc = Math.round(timeSinceLastSkewCalc(Date.now())/1000);

  // --- Head Text
  var timerHeadTextEl      = document.getElementById("timer_head_text");
  var hasHeadText = (data==null) ? "" : (data.headText.length>0) ? 1 : 0;
  if (enHeader && hasHeadText) {
    timerHeadTextEl.style.fontSize          = timerHeadTextFontSize + "pt";
    timerHeadTextEl.innerHTML               = data.headText;
  } else {
    timerHeadTextEl.innerHTML               = "";
  }

  // --- Time M:SS
  var timerMssEl      = document.getElementById("timer_mss");
  timerMssEl.style.marginTop         = hasHeadText ? 0 : Math.floor(timerCaptionFontSize/3);
  timerMssEl.style.borderWidth       = 0;
  timerMssEl.style.fontSize          = timerMssFontSize + "pt";
  timerMssEl.style.color             = timeColor;
  timerMssEl.innerHTML               = timeStr.trim();

  // --- Caption
  var timerCaptionEl  = document.getElementById("timer_caption");
  if (enCaption) {
    timerCaptionEl.style.fontSize     = timerCaptionFontSize + "pt";
    timerCaptionEl.innerHTML          = captionStr.trim();
  } else {
    timerCaptionEl.style.display = "none";
  }

  // --- Logos
  if (enLogo) {
    document.getElementById("timer_caption_left" ).style.display = "block";
    document.getElementById("timer_caption_right").style.display = "block";
    var timerLogoLtEl = document.getElementById("timer_logo_left");
    timerLogoLtEl.style.opacity = 1-iterationOddPhase;
    timerLogoLtEl.width  = logoSize;
    timerLogoLtEl.height = logoSize;
    var timerLogoRtEl = document.getElementById("timer_logo_right");
    timerLogoRtEl.style.opacity =   iterationOddPhase;
    timerLogoRtEl.width  = logoSize;
    timerLogoRtEl.height = logoSize;
  }
  
  // --- BarGraph --- show how long since last skew update (window width means 5min)
  var timerBargraphEl = document.getElementById("timer_bargraph");
  timerBargraphEl.style.width = Math.max( 0, Math.min( winWidth-20,  Math.floor( winWidth * secsSinceLastSkewCalc/(5*60) ) ) ) + "px";
  timerBargraphEl.style.backgroundColor       = "#ccc";

  // --- Note
  var noteStrSep = "&nbsp;&nbsp;"
  var noteStr="";
  noteStr += soundEnabled ? "S |" : "";
  noteStr += String.format(" {0:##.0}%",(100*(elapsedTimeRun/(elapsedTimeRun+elapsedTimeIdle))));
  noteStr += " skewAge " + mssStr(secsSinceLastSkewCalc) + " |";
  noteStr += String.format(" skew {0:####.000}s",Math.round(skewCurrentMS)/1000) + noteStrSep;
  noteStr += String.format("{0:#####}ppm |",skewDriftCurrentPPM) + noteStrSep;
  //noteStr += String.format(" (iir {0:####.000}s) |",skewSlowIirMS/1000) + noteStrSep;
  //noteStr += String.format("intv={0:0}s |",Math.round(skewCurrentInterval/1000)) + noteStrSep;
  noteStr += skewDebugStr;
  var timerNoteEl     = document.getElementById("timer_note");
  if (enSimple) {
    timerNoteEl.innerHTML = "";    
  } else {
    timerNoteEl.innerHTML = noteStr;
  }

}


var updateTimerTS=0;
var prevUpdateInfo = {};

var elapsedTimeRun=0;
var elapsedTimeIdle=0;
var elapsedTimeStamp=0;
var elapsedTimePrev=0;

function updateTimerDOM(){
  //console.log("updating timer dom");
  window.clearTimeout(timerId);

  elapsedTimeStamp=Date.now();
  if (elapsedTimePrev) {
    elapsedTimeIdle += (elapsedTimeStamp - elapsedTimePrev);
  }
  elapsedTimePrev=elapsedTimeStamp;

  // 400ms change indicative of local clock adjustment?
  var detectedCallInterval = Date.now() - updateTimerTS;
  if ( Math.abs(detectedCallInterval) > thresholdTimerForceSkewUpdateMS ) {
    console.log("updateTimerDOM: VERY unexpected interval "+detectedCallInterval);
    recheckSkewCalcs();
    flushFirebase(1);
  } else {
    flushFirebase(0);
  }
  updateTimerTS=Date.now();


  var msPerSec = 1000;
  
  if (data.onceType==null) {
    data.onceType = 0;
  }

  var intervalSec   = data.climbTime + (data.onceType ? 0 : data.transTime);
  var adjNowMS  = nowAdjustedForSkewMS();
  var secondsSinceStart    = Math.floor( (adjNowMS - data.start) / msPerSec);
  var millisecondsSinceSec =             (adjNowMS - data.start) % msPerSec;

  var iterationNum         = Math.floor(secondsSinceStart / intervalSec);
  var intraIntervalTimeSec =            secondsSinceStart % intervalSec ;

  var iterationOdd      = iterationNum % 2;
  var slotNum           = iterationNum % 100;
  var countdownTimeSec  = intervalSec - intraIntervalTimeSec;
  
  if (data.onceType && iterationNum>0) {
    iterationOdd = 0;
    slotNum = 0;
    countdownTimeSec = 0;
  }

  var isClimb = (countdownTimeSec > data.climbTime) ? 0 : 1;
  if (!isClimb) { countdownTimeSec -=  data.climbTime; }

  var isTrans = (iterationNum>0) && ((data.transTime>0) ? (!isClimb && (countdownTimeSec == data.transTime)) : ( isClimb && (countdownTimeSec == data.climbTime)));

  var transPhase = Math.floor( Math.min( 1 , 2*millisecondsSinceSec/msPerSec ) * 16 ) / 16;
  var iterationOddPhase = isTrans ? (iterationOdd ? transPhase : (1-transPhase)) : iterationOdd;

  var updateInfo = {};
  updateInfo.DispTime           = countdownTimeSec;
  updateInfo.isClimb            = isClimb;
  updateInfo.iterationOddPhase  = iterationOddPhase;
  updateInfo.width              = window.innerWidth;
  updateInfo.height             = window.innerHeight;

  var millisecondsUntilSec = 0;
  millisecondsUntilSec = 10 + msPerSec - ((nowAdjustedForSkewMS() - data.start) % msPerSec);
  //console.log("millisecondsUntilSec="+millisecondsUntilSec);

  // only update DOM if we are changing the displayed time
  if (Object.compare_equiv(updateInfo, prevUpdateInfo)) {
    //console.log("updateTimerDOM: not updating DOM");
  } else {
    //console.log("updateTimerDOM: updating DOM");
    //console.log(updateInfo);
    prevUpdateInfo = updateInfo;
    millisecondsUntilSec = 0;

    var timeStr = mssStr(countdownTimeSec);
    var timeColor="grey";
    var captionStr  = "n/a";

    if (isClimb) {
      if (countdownTimeSec > (data.climbTime-2)) {
        if (data.transTime>0) { playSound("begin");    }
        else                  { playSound("endBegin"); }
      }
      captionStr = (data.transTime>0) ? "CLIMB" : "";
      timeColor = (countdownTimeSec>60) ? "black" : "red";
      if (countdownTimeSec == 60) { playSound("oneMinWarning"); }
      if (countdownTimeSec == 10) { playSound("tenSecWarning"); }
    }
    else {
      if (countdownTimeSec > (data.transTime-2)) {
        playSound("beginTransition");
      }
      captionStr = "transition";
      timeColor = "green";
    }

    if (enSlot || enTod) {
      captionStr += "<BR>";
      if (enSlot) { captionStr += twoDigitStr(slotNum); }
      if (enSlot && enTod) { captionStr += "&nbsp;/&nbsp;"; }
      if (enTod)  { captionStr += getTimeOfDayStr(); }
    }

    writeTimerDOM(iterationOddPhase,timeStr,timeColor,captionStr);
  }

  // setup Timer to call us again
  runTimer(millisecondsUntilSec);

  elapsedTimeStamp=Date.now();
  if (elapsedTimePrev) {
    elapsedTimeRun += (elapsedTimeStamp - elapsedTimePrev);
  }
  elapsedTimePrev=elapsedTimeStamp;

};

function clearTimerDOM(){
  console.log("clearing timer dom");
  if (data == null) {
    writeTimerDOM(0, "",     "red",  "Invalid timer name:<br/>"+eventName);
  } else if (data.onceType) {
    writeTimerDOM(0, mssStr(data.climbTime), "grey", "(timer not started)"+(enTod?"<br/>&nbsp;":""));
  } else {
    writeTimerDOM(0, "0:00", "grey", "(timer not started)"+(enTod?"<br/>&nbsp;":""));
  }
}


function runTimer(desiredIntervalTimerUpdateMS){
  if (desiredIntervalTimerUpdateMS > 0 && desiredIntervalTimerUpdateMS < normalIntervalTimerUpdateMS) {
    //console.log("desiredIntervalTimerUpdateMS="+desiredIntervalTimerUpdateMS);
    //console.log("elapsedTimeIdle="+elapsedTimeIdle);
    //console.log("elapsedTimeRun="+elapsedTimeRun);
    //console.log("elapsedTimeRun%="+(100*(elapsedTimeRun/(elapsedTimeRun+elapsedTimeIdle))));
    intervalTimerUpdateMS = desiredIntervalTimerUpdateMS;
  } else {
    intervalTimerUpdateMS = normalIntervalTimerUpdateMS;
  }
  timerId = window.setTimeout(updateTimerDOM,     intervalTimerUpdateMS);
};

// ------------------------------------------------
// (startup)

getAndProcessEvent();
if (enSound) { loadSounds(); }

