

var sounds = {
    "play":            { url: "snd/cs1.wav" },
    "begin":           { url: "snd/cs1.wav" },
    "end":             { url: "snd/ce.wav" },
    "oneMinWarning":   { url: "snd/c60.wav" },
    "tenSecWarning":   { url: "snd/c10.wav" },
    "beginTransition": { url: "snd/ts.wav" },
    "endBegin":        { url: "snd/cs0.wav" }
};

var soundName = "play";
var soundOn = 0;
var soundDate = 0;

function loadSounds() {
    var el;
    var timer_mss = document.getElementById("timer_audio");

    for (k in sounds) {
        if (sounds.hasOwnProperty(k)) {
            sound = sounds[k];
            //console.log("sound " + k + " url " + sound.url);
            if (document.getElementById("audio_"+k) == null) {
                //console.log("creating audio_"+k)
                var audio = document.createElement("AUDIO");
                audio.id = "audio_"+k;
                audio.setAttribute("src", "snd/cs1.wav");
                audio.setAttribute("preload", "auto");

                timer_mss.appendChild(audio);
            } else {
                console.log("audio_"+k+" already exists")
            }
        }
    }
    if (document.getElementById("audio_play_button") == null) {
        el = document.createElement("button");
        el.innerHTML = 'Start Audio';
        el.id = "audio_play_button";
        el.addEventListener('click', function (e) {
            soundOn = 1;
            play();
            hideTimerAudio();
        });
        timer_mss.appendChild(el);
    }
}

function hideTimerAudio() {
    document.getElementById("timer_audio").style.display = "none";
}

function playSound(name) {
    var thisDate = Date.now();
    if ((thisDate - soundDate) > 5000) {
        soundName = name;
        play();
        soundDate = thisDate;
    }
}

function play() {
    if (soundOn) {
        var audioEl = document.getElementById("audio_play");
        if (audioEl) {
            audioEl.setAttribute("src",sounds[soundName].url);
            console.log("play audio_"+soundName);
            audioEl.play();
        } else {
            console.log("no audio??")
        }
    }
}


