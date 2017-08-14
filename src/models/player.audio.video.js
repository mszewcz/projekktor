/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
*/
(function(window, document, $, $p){
    
$p.newModel({

    modelId: 'VIDEO',
    androidVersion: "4.0",
    iosVersion: "5.0",
    nativeVersion: "1.0",
    iLove: [
        {ext:'mp4', type:'video/mp4', platform:['ios', 'android', 'native']},
        {ext:'m4v', type:'video/mp4', platform:['ios', 'android', 'native']},
        {ext:'ogv', type:'video/ogg', platform:['native']},
        {ext:'webm',type:'video/webm', platform:['native']},
        {ext:'ogg', type:'video/ogg', platform:['native']},
        {ext:'anx', type:'video/ogg', platform:['native']}
    ],

    _eventMap: {
        pause:          "pauseListener",
        play:           "playingListener",
        volumechange:   "volumeListener",
        progress:       "progressListener",
        timeupdate:     "_timeupdate",
        ended:          "_ended",
        waiting:        "waitingListener",
        canplaythrough: "canplayListener",
        canplay:        "canplayListener",
        // suspend:        "suspendListener",
        // abort:          "abortListener",
        error:          "errorListener",
        emptied:        "emptiedListener",
        stalled:        "stalledListener",
        seeked:         "seekedListener",
        loadedmetadata: "resizeListener",
        loadeddata:     "resizeListener",
        resize:         "resizeListener",
        // loadstart:      null,
        webkitbeginfullscreen: "webkitfullscreenListener",
        webkitendfullscreen: "webkitfullscreenListener"
    },
    _eventsBinded: [],
    allowRandomSeek: false,
    videoWidth: 0,
    videoHeight: 0,
    wasPersistent: true,
    endedTimeout: 0,
    displayingFullscreen: false,
    _lastPosition: null,

    init: function() {
        this._lastPosition = null;
        this._eventsBinded = [];
        this.ready();
    },

    applyMedia: function(destContainer) {

        if ($('#'+this.pp.getMediaId()+"_html").length === 0) {

            this.wasPersistent = false;

            destContainer.html('').append(
                $('<video/>')
                .attr({
                    "id": this.pp.getMediaId()+"_html",
                    "loop": false,
                    "autoplay": false,
                    "preload": "none",
                    "x-webkit-airplay": "allow",
                    "playsinline": ""
                }).prop({
                    controls: false,
                    volume: this.getVolume()
                }).css({
                    'width': '100%',
                    'height': '100%',
                    'position': 'absolute',
                    'top': 0,
                    'left': 0
                })
            );
        }

        this.mediaElement = $('#'+this.pp.getMediaId()+"_html");
        this.addListeners();
        this.applySrc();
    },

    applySrc: function() {
        var ref = this,
            media = this.getSource(),
            wasAwakening = ref.getState('AWAKENING');

        /*
         * Using 'src' attribute directly in <video> element is safer than using it inside <source> elements.
         * Some of the mobile browsers (e.g. Samsung Galaxy S2, S3 Android native browsers <= 4.2.2)
         * will not initialize video playback with <source> elements at all, displaying only gray screen instead.
         * HLS stream on iOS and Android will not work if its URL is defined through <source> 'src' attribute
         * instead of <video> 'src' attribute.
         */
        this.mediaElement.attr('src', media[0].src);
        this.mediaElement.attr('type', media[0].type );

        /*
         * Some of the mobile browsers (e.g. Android native browsers <= 4.2.x, Opera Mobile)
         * have by default play/pause actions bound directly to click/mousedown events of <video>.
         * That causes conflict with display plugin play/pause actions, which makes it impossible
         * to pause the currently playing video. Precisely _setState is called twice:
         * first by pauseListener triggered by <video> default click/mousedown action,
         * secondly by display plugin actions bound to mousedown events. The result is that
         * the video is paused by native <video> events and then immediately started by display
         * plugin that uses the setPlayPause function. setPlayPause function toggles between
         * "PAUSED" and "PLAYING" states, so when a video is being played, the function causes its pausing.
         */
        this.mediaElement.on('mousedown.projekktorqs'+this.pp.getId(), this.disableDefaultVideoElementActions);
        this.mediaElement.on('click.projekktorqs'+this.pp.getId(), this.disableDefaultVideoElementActions);

        var func = function(e){
            ref.mediaElement.off('loadstart.projekktorqs'+ref.pp.getId());
            ref.mediaElement.off('loadeddata.projekktorqs'+ref.pp.getId());
            ref.mediaElement.off('canplay.projekktorqs'+ref.pp.getId());

            ref.mediaElement = $('#'+ref.pp.getMediaId()+"_html");

            if (wasAwakening) {
                ref.displayReady();
                return;
            }

            if (ref.getSeekState('SEEKING')) {
                if (ref._isPlaying){
                    ref.setPlay();
                }

                ref.seekedListener();
                return;
            }

            ref.setSeek(ref.media.position || 0);

            if (ref._isPlaying){
                ref.setPlay();
            }

        };

        this.mediaElement.on('loadstart.projekktorqs'+this.pp.getId(), func);
        this.mediaElement.on('loadeddata.projekktorqs'+this.pp.getId(), func);
        this.mediaElement.on('canplay.projekktorqs'+this.pp.getId(), func);

        this.mediaElement[0].load(); // important especially for iOS devices
    },

    detachMedia: function() {
        try {
            this.mediaElement.off('.projekktorqs'+this.pp.getId());
            this.mediaElement[0].pause();
        } catch(e){}
    },

    /*****************************************
     * Handle Events
     ****************************************/
    addListeners: function(evtId, subId) {
        if (this.mediaElement==null) {
            return;
        }
        var id = (subId!=null) ? '.projekktor'+subId+this.pp.getId() : '.projekktor'+this.pp.getId(),
            ref = this,
            evt = (evtId==null) ? '*' : evtId;

        $.each(this._eventMap, function(key, value){
            if ((key==evt || evt=='*') && value!=null && ref._eventsBinded.indexOf(key) === -1) {
                ref.mediaElement.on(key + id, function(evt) { ref[value](this, evt); });
                ref._eventsBinded.push(key);
            }
        });
    },

    removeListeners: function(evt, subId) {
        if (this.mediaElement==null) {
            return;
        }
        evt = (evt === void 0) ? '*' : evt;

        var id = (subId!=null) ? '.projekktor'+subId+this.pp.getId() : '.projekktor'+this.pp.getId(),
            ref = this;

        $.each(this._eventMap, function(key, value){
            if (key === evt || evt === '*') {
                ref.mediaElement.off(key + id);
                var idx = ref._eventsBinded.indexOf(key);
                if(idx>-1){
                    ref._eventsBinded.splice(idx,1);
                }
            }
        });
    },

    // Workaround for problems with firing ended event in Chromium based browsers
    // e.g. Samsung Galaxy S4 on Android 4.4.2 KitKat native Internet Browser 1.5.28 1528 based on Chrome 28.0.1500.94
    // More info about the issues with ended event here: https://code.google.com/p/chromium/issues/detail?id=349543
    _timeupdate: function(video, event) {
        var ref = this;
        if(video.duration - video.currentTime < 1) {
            this.endedTimeout = setTimeout(function(){
                clearTimeout(ref.endedTimeout);
                if(!video.paused && Math.round(video.duration - video.currentTime) === 0){
                    $p.utils.log('VIDEO model: ended event forced');
                    ref._ended();
                }
            }, 1000);
        }
        // check for video size change (e.g. HLS on Safari OSX or iOS)
        this.resizeListener(video);

        // IE & Edge firing timeupdate event even if the currentTime didn't change,
        // this has place when the video is buffering and cause IE & Edge
        // don't fire waiting & stalled events we can use that bug to set
        // buffering state to 'EMPTY'. It's a hack but it's working.
        if(video.currentTime !== this._lastPosition){
            // we assume that the buffer is full when the video time was updated
            if(this._lastPosition !== null){
                this._setBufferState('FULL');
            }
            this._lastPosition = video.currentTime;
            this.timeListener.apply(this, arguments);
        }
        else {
            this._setBufferState('EMPTY');
        }
    },

    _ended: function() {
        clearTimeout(this.endedTimeout);

        var dur = this.mediaElement[0].duration, // strange android behavior workaround
            complete = (Math.round(this.media.position) === Math.round(dur)),
            fixedEnd = ( (dur-this.media.maxpos) < 2 ) && (this.media.position===0) || false;

        if (complete || fixedEnd) {
            this.endedListener(this);
        } else {
            this.pauseListener(this);
        }
    },

    playingListener: function(obj) {
        var ref = this;
        (function() {
            try{
                if (ref.getDuration()===0) {
                    if(ref.mediaElement.get(0).currentSrc!=='' && ref.mediaElement.get(0).networkState==ref.mediaElement.get(0).NETWORK_NO_SOURCE) {
                        ref.sendUpdate('error', 80);
                        return;
                    }
                    setTimeout(arguments.callee, 500);
                    return;
                }
            } catch(e) {}
        })();

        this._setState('playing');
    },

    errorListener: function(obj, evt) {
        try {
            switch (evt.target.error.code) {
                case evt.target.error.MEDIA_ERR_ABORTED:
                    this.sendUpdate('error', 1);
                    break;
                case evt.target.error.MEDIA_ERR_NETWORK:
                    this.sendUpdate('error', 2);
                    break;
                case evt.target.error.MEDIA_ERR_DECODE:
                    this.sendUpdate('error', 3);
                    break;
                case evt.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    this.sendUpdate('error', 4);
                    break;
                default:
                    this.sendUpdate('error', 5);
                    break;
            }
        } catch(e) {}
    },

    emptiedListener: function (obj) {
        this._setBufferState('EMPTY');
    },

    stalledListener: function (obj) {
        this._setBufferState('EMPTY');
    },

    canplayListener: function(obj) {
        this._setBufferState('FULL');
    },

    webkitfullscreenListener: function(evt){
        this.displayingFullscreen = this.mediaElement[0][$p.fullscreenApi.mediaonly.displayingFullscreen];
        this.fullscreenchangeListener(this.displayingFullscreen);
    },

    disableDefaultVideoElementActions: function(evt){
            evt.preventDefault();
    },

    getMediaStatus: function(name){
        if($p.utils.logging){
            var m = this.mediaElement[0],
                networkState  = m.networkState,
                readyState = m.readyState,
                error = m.error,
                pos = m.currentTime,
                dur = m.duration,
                buffered = m.buffered,
                seekable = m.seekable;

            $p.utils.log('| ' + name + ' |');
            $p.utils.log(
                        '| networkState: ', this._getNetworkStateName(networkState),
                        'readyState: ', this._getReadyStateName(readyState),
                        'error: ', this._getErrorName(error)
                        );
            $p.utils.log('| duration: ', dur, 'currentTime: ', pos);
            $p.utils.log('| buffered: ', this._loopThroughTimeRanges(buffered));
            $p.utils.log('| seekable: ', this._loopThroughTimeRanges(seekable));
        }
    },

    _getNetworkStateName: function(networkStateCode){
        var result = networkStateCode + " - ";
        switch(networkStateCode){
            case 0:
                result += "NETWORK_EMPTY";
                break;
            case 1:
                result += "NETWORK_IDLE";
                break;
            case 2:
                result += "NETWORK_LOADING";
                break;
            case 3:
                result += "NETWORK_NO_SOURCE";
                break;
        }
        return result;
    },

    _getReadyStateName: function(readyStateCode){
        var result = readyStateCode + " - ";
        switch(readyStateCode){
            case 0:
                result += "HAVE_NOTHING";
                break;
            case 1:
                result += "HAVE_METADATA";
                break;
            case 2:
                result += "HAVE_CURRENT_DATA";
                break;
            case 3:
                result += "HAVE_FUTURE_DATA";
                break;
            case 4:
                result += "HAVE_ENOUGH_DATA";
                break;
        }
        return result;
    },

    _getErrorName: function(errorCode){
        var result = errorCode + " - ";
        switch(errorCode){
            case 1:
                result += "MEDIA_ERR_ABORTED";
                break;
            case 2:
                result += "MEDIA_ERR_NETWORK";
                break;
            case 3:
                result += "MEDIA_ERR_DECODE";
                break;
            case 4:
                result += "MEDIA_ERR_SRC_NOT_SUPPORTED";
                break;
        }
        return result;
    },

    _loopThroughTimeRanges: function(timeRanges) {
        var i = 0,
            l = timeRanges.length,
            result = "lenght: " + l + "; ";

        for(; i<l; i++){
            result += "#" + i + " - ";
            result += "start: " + timeRanges.start(i) + ", ";
            result += "end: " + timeRanges.end(i);
            result += "; ";
        }

        return result;
    },

    /*****************************************
     * Setters
     ****************************************/
    setPlay: function() {
        try{this.mediaElement[0].play();} catch(e){}
    },

    setPause: function() {
        try {this.mediaElement[0].pause();} catch(e){}
    },

    setVolume: function(volume) {
        if (this.mediaElement === null) {
            this.volumeListener(volume);
        }
        else {
            this.mediaElement.prop('volume', volume);
        }
    },

    setSeek: function(newpos) {
        var ref = this,
            np = newpos,
            relPos = true;

        // IE9 somtimes raises INDEX_SIZE_ERR
        (function() {
            try {
                // if it's a DVR stream
                if(ref._isDVR){
                    /*
                     * iOS 7.1.2 Safari 7.0 behaviour is weird cause it takes absolute values
                     * when the OSX 10.9.4 Safari 7.0.5 takes relative values for seeking through timeline.
                     * E.g. when we want to seek to the begining of the DVR window which duration is 60s
                     * and the stream already plays for 120s on iOS Safari we must seek to 0 position, when
                     * on OSX Safari we must seek to 60 position. Same for seeking to the live point:
                     * on iOS Safari we must seek to the 60 position (duration of DVR window) but on
                     * OSX Safari we must seek to the seeking.end(0) position, which is in our case 120.
                     */
                    relPos = (ref.mediaElement[0].seekable.start(0) > 0);
                    if(newpos<0) { // snap to live position
                        if(relPos){
                            np = ref.mediaElement[0].seekable.end(0)-2;
                        }
                        else {
                            np = ref.media.duration;
                        }
                    }
                    else {
                        if(relPos){
                            np = ref.mediaElement[0].seekable.end(0) - (ref.media.duration - newpos);
                        }
                        else {
                            np = newpos;
                        }
                    }
                }

                ref.mediaElement[0].currentTime = np;
                ref.timeListener({position: np});
            }
            catch(e){
                if (ref.mediaElement !== null) {
                    setTimeout(arguments.callee, 100);
                }
            }

        })();
    },
    /************************************************
     * getters
     ************************************************/

    getVolume: function () {
        if (this.mediaElement === null) {
            return this._volume;
        }

        return this.mediaElement.prop('volume');
    }
});

$p.newModel({

    modelId: 'AUDIO',

    iLove: [
        {ext:'ogg', type:'audio/ogg', platform:['native']},
        {ext:'oga', type:'audio/ogg', platform:['native']},
        {ext:'mp3', type:'audio/mp3', platform:['ios', 'android', 'native']},
        {ext:'mp3', type:'audio/mpeg', platform:['ios', 'android', 'native']}
    ],

    imageElement: {},

    applyMedia: function(destContainer) {

        $p.utils.blockSelection(destContainer);

        if ($('#'+this.pp.getMediaId()+"_html").length===0) {
            this.wasPersistent = false;
            destContainer.append(
                $('<audio/>')
                .attr({
                    "id": this.pp.getMediaId()+"_html",
                    "poster": $p.utils.imageDummy(),
                    "loop": false,
                    "autoplay": false,
                    "preload": "none",
                    "x-webkit-airplay": "allow",
                    "playsinline": ""
                }).prop({
                    controls: false,
                    volume: this.getVolume()
                }).css({
                    'width': '1px',
                    'height': '1px',
                    'position': 'absolute',
                    'top': 0,
                    'left': 0
                })
            );
        }
        // create cover image
        this.imageElement = this.applyImage(this.getPoster('cover') || this.getPoster('poster'), destContainer);
        this.imageElement.css({border: '0px'});

        this.mediaElement = $('#'+this.pp.getMediaId()+"_html");
        this.applySrc();
    },

    setPosterLive: function() {
        if (this.imageElement.parent) {
            var dest = this.imageElement.parent(),
            ref = this;

            if (this.imageElement.attr('src') == this.getPoster('cover') || this.getPoster('poster'))
                return;

            this.imageElement.fadeOut('fast', function() {
                $(this).remove();
                ref.imageElement = ref.applyImage(ref.getPoster('cover') || ref.getPoster('poster'), dest );
            });
        }
    }

}, 'VIDEO');

}(window, document, jQuery, projekktor));