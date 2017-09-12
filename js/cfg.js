
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

// ------------------------------------------------
// --- Parse the URL
        
var pathElements = document.location.pathname.split("/");
var basePath     = "/" + pathElements[1] + "/";

// ------------------------------------------------
// --- Create and display list of Events

function getEvents(){
  firebase.database().ref('event/').once('value').then(function(snapshot){
    var events = snapshot.val();
    console.log(events);
   
    var eventDiv = document.getElementById("events");
    console.log(eventDiv);
    eventDiv.innerHTML = '';

    var el;

    var tab = document.createElement("table");
    tab.border = 1;
    tab.id = "events_list";

    var th = tab.createTHead().insertRow(-1);
    th.className = "config";
    th.insertCell(-1).innerHTML = "";
    th.insertCell(-1).innerHTML = "State";
    th.insertCell(-1).innerHTML = "Name";
    th.insertCell(-1).innerHTML = "Climb";
    th.insertCell(-1).innerHTML = "Trans";
    th.insertCell(-1).innerHTML = "tzOff";
    th.insertCell(-1).innerHTML = "HdrTxt";
    th.insertCell(-1).innerHTML = "pw";
    th.insertCell(-1).innerHTML = "";
    th.insertCell(-1).innerHTML = "";
    th.insertCell(-1).innerHTML = "";
    th.insertCell(-1).innerHTML = "";
  
    var keys = Object.keys(events);
    for (var i = 0; i < keys.length; i++){
      k = keys[i];
      console.log(k);
      var event=events[k];
      console.log(event);

      var tr = tab.insertRow(-1);
      var td;

      td = tr.insertCell(-1);
      el = document.createElement("button");
      el.innerHTML = 'delete';
      el.id = "event_delete";
      el.dataset.event = k;
      el.className = "config";
      el.addEventListener('click', function(e){
        deleteEvent(this.dataset.event);
      });
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.start ? "ON" : "off";
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = k;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.climbTime;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.transTime;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.tzOffset;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.headText;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("bold");
      el.innerHTML = event.password;
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("a");
      el.href = basePath + k;
      el.innerHTML = "View";
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("a");
      el.href = basePath + k + "-s";
      el.innerHTML = "Snd";
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("a");
      el.href = basePath + k + "-p" + event.password;
      el.innerHTML = "Adm";
      el.className = "config";
      td.appendChild(el);

      td = tr.insertCell(-1);
      el = document.createElement("a");
      el.href = basePath + k + "-s-p" + event.password;
      el.innerHTML = "Adm+Snd";
      el.className = "config";
      td.appendChild(el);

    }

    eventDiv.appendChild(tab);
  });
};


// ------------------------------------------------
// --- DELETE Event

function deleteEvent(name){
  firebase.database().ref('event/' + name).remove();
  getEvents();
};

// ------------------------------------------------
// --- CREATE Event

function createEvent(name, climbTime, transTime, tzOffset, headText, password){
  firebase.database().ref('event/' + name).set({
    climbTime: parseInt(climbTime),
    transTime: parseInt(transTime),
    tzOffset:  parseFloat(tzOffset),
    headText:  headText,
    password:  password
  });
  getEvents();
};

var createEventBtn = document.getElementById('event_submit');
createEventBtn.addEventListener('click', function(e) {
  var name       = document.getElementById("event_name").value;
  var climbTime  = document.getElementById("event_climb_time").value;
  var transTime  = document.getElementById("event_trans_time").value;
  var tzOffset   = document.getElementById("event_tz_offset").value;
  var headText   = document.getElementById("event_head_text").value;
  var password   = document.getElementById("event_password").value;
  var headText   = document.getElementById("event_head_text").value;

  createEvent(name, climbTime, transTime, tzOffset, headText, password)

});

// ------------------------------------------------
// --- (startup)

getEvents();
