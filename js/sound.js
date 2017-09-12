
var audioContext = null;

var sounds = {
    "begin":           { url: "snd/cs1.wav" },
    "oneMinWarning":   { url: "snd/c60.wav" },
    "tenSecWarning":   { url: "snd/c10.wav" },
    "beginTransition": { url: "snd/ts.wav" },
    "endBegin":        { url: "snd/cs0.wav" }
};

var soundEnabled = 0;

function loadSounds() {
    var k, sound, count;

    try {
        // Fix up for prefixing
        window.AudioContext = window.AudioContext||window.webkitAudioContext;
        audioContext = new AudioContext();
    }
    catch(e) {
        alert('Audio is not supported by this browser. Timer announcements will not be heard.');
    }

    function loadSound(s) {
        var request = new XMLHttpRequest();


        var fullURL=baseURL + s.url;

        request.open('GET', fullURL, true);
        request.responseType = 'arraybuffer';

        // Decode asynchronously
        request.onload = function () {
            audioContext.decodeAudioData(request.response, function (buffer) {
                s.buffer = buffer;
                count -= 1;
                console.log( "Sound file loaded: " + fullURL);
                if (count === 0) {
                    console.log( "All sounds loaded");
                    soundEnabled = 1;
                }
            }, function () {
                s.buffer = null;
                //xxx error function
            });
        };
        request.send();
    }

    if (audioContext) {
        count = 0;
        for (k in sounds) {
            if ( sounds.hasOwnProperty(k)) {
                count += 1;
            }
        }
        for (k in sounds) {
            if ( sounds.hasOwnProperty(k)) {
                sound = sounds[k];
                loadSound(sound);
            }
        }
    } else {
        console.log("no audioContext - not loading sounds");
    }

}

var prevDate = 0;

function playSound(name) {
    if (audioContext && soundEnabled) {
        var buffer,
            source = audioContext.createBufferSource();
        var thisDate = Date.now();
        if ( (thisDate-prevDate) > 5000 ) {
            console.log("sound: "+name);
            if (sounds[name]) {
                buffer = sounds[name].buffer;
                if (buffer) {
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    source.start(0);
                }
                prevDate = thisDate;
            }
        }
    }
}




