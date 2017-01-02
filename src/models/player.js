/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */
var playerModel = function () {
};
jQuery(function ($) {
    playerModel.prototype = {
        modelId: 'player',
        iLove: [],
        platform: ['browser'],
        // all the player states
        _currentState: null,
        _currentBufferState: 'EMPTY', // EMPTY / FULL
        _currentSeekState: null,
        _ap: false, // autoplay
        _volume: 1, // async
        _fixedVolume: false,
        _quality: 'auto',
        _displayReady: false,
        _isPlaying: false,
        _isReady: false,
        _isDVR: false,
        _isLive: false,
        _id: null,
        // experimental
        _KbPerSec: 0,
        _bandWidthTimer: null,
        // flags
        _isPoster: false,
        _isFullscreen: false,
        hasGUI: false,
        allowRandomSeek: false,
        mediaElement: null,
        pp: {},
        media: {
            duration: 0,
            position: 0,
            maxpos: 0,
            offset: 0,
            file: false,
            poster: '',
            ended: false,
            loadProgress: 0,
            errorCode: 0
        },
        /*******************************
         *        CORE
         *******************************/
        _init: function (params) {
            this.pp = params.pp || null;
            this.media = $.extend(true, {}, this.media, params.media);
            this.mediaId = params.media.id;
            this._ap = params.autoplay;
            this._isFullscreen = params.fullscreen;
            this._id = $p.utils.randomId(8);
            this._quality = params.quality || this._quality;
            this._volume = params.environment.volume;
            this.init();
        },
        init: function (params) {
            this.ready();
        },
        ready: function () {
            this.sendUpdate('modelReady');
            this._isReady = true;
            if (!this._ap) {
                this.displayItem(false);
            }
            else {
                this.displayReady();
            }
        },
        /* apply poster while sleeping or get ready for true multi media action */
        displayItem: function (showMedia) {
            // reset
            this._displayReady = false;
            this._isPoster = false;

            this.pp.removeListener('fullscreen.poster');
            this.pp.removeListener('resize.poster');

            // poster 
            if (showMedia !== true || this.getState('STOPPED')) {
                this._setState('idle');
                this.applyImage(this.getPoster(), this.pp.getMediaContainer().html(''));
                this._isPoster = true;
                this.displayReady();
                return;
            }

            // media
            $('#' + this.pp.getMediaId() + "_image").remove();
            // apply media
            this.applyMedia(this.pp.getMediaContainer());
        },
        applyMedia: function () {
        },
        sendUpdate: function (type, value) {
            // type = type.toLowerCase();
            this.pp._modelUpdateListener(type, value);
            if (type == 'error') {
                this.removeListeners();
                this.detachMedia();
                this._setState('error');
            }
        },
        /* wait for the playback element to initialize */
        displayReady: function () {
            this._displayReady = true;
            this.pp._modelUpdateListener('displayReady');
        },
        start: function () {
            var ref = this;

            if (this.mediaElement == null && this.modelId !== 'PLAYLIST') {
                return;
            }

            if (this.getState('STARTING')) {
                return;
            }

            this._setState('STARTING');

            if (!this.getState('STOPPED')) {
                this.addListeners();
            }
            
            this.applyCommand('volume', this.pp.getVolume());
            
            if (this.pp.getIsMobileClient('ANDROID') && !this.getState('PLAYING')) {
                setTimeout(function () {
                    ref.setPlay();
                }, 50);
            }
            this.setPlay();
        },
        addListeners: function () {
        },
        removeListeners: function () {
            try {
                this.mediaElement.unbind('.projekktor' + this.pp.getId());
            } catch (e) {
            }
        },
        detachMedia: function () {
        },
        destroy: function (silent) {

            this.removeListeners();

            if (!this.getState('IDLE'))
                this._setState('destroying');

            this.detachMedia();

            try {
                $('#' + this.mediaElement.id).empty();
            } catch (e) {
            }
            if (!this.pp.getIsMobileClient()) {
                try {
                    $('#' + this.mediaElement.id).remove();
                } catch (e) {
                }
                try {
                    this.mediaElement.remove();
                } catch (e) {
                }
                this.pp.getMediaContainer().html('');
            }
            this.mediaElement = null;

            this.media.loadProgress = 0;
            this.media.playProgress = 0;
            this.media.frame = 0;
            this.media.position = 0;
            this.media.duration = 0;
        },
        applyCommand: function (command, value) {
            switch (command) {
                case 'quality':
                    this.setQuality(value);
                    break;
                case 'error':
                    this._setState('error');
                    this.pp._modelUpdateListener('error', value);
                    break;
                case 'play':
                    if (this.getState('ERROR'))
                        break;
                    if (this.getState('IDLE')) {
                        this._setState('awakening');
                        break;
                    }
                    this.setPlay();
                    break;
                case 'pause':
                    if (this.getState('ERROR'))
                        break;
                    this.setPause();
                    break;
                case 'volume':
                    if (this.getState('ERROR'))
                        break;
                    this.setVolume(value);
                    break;
                case 'stop':
                    this.setStop();
                    break;
                case 'frame':
                    this.setFrame(value);
                    break;
                case 'seek':
                    if (this.getState('ERROR')) {
                        break;
                    }

                    if (this.getSeekState('SEEKING')) {
                        break;
                    }

                    if (this.getState('IDLE')) {
                        break;
                    }

                    if (this.media.loadProgress == -1) {
                        break;
                    }

                    this._setSeekState('seeking', value);
                    this.setSeek(value);
                    break;
                case 'fullscreen':
                    /* 
                     * It is vital to first tell the controller what happened in order to have an already altered DOM
                     * before processing further scaling processes.
                     * This is a break in the logic but seems to work.
                     */
                    if (value !== this._isFullscreen) {
                        this._isFullscreen = value;
                        this.setFullscreen();
                    }
                    break;
                case 'resize':
                    this.setResize();
                    this.sendUpdate('resize', value);
                    break;
            }
        },
        /*******************************
         *   PUBLIC ELEMENT SETTERS
         *******************************/
        setFrame: function (frame) {
            var newPos = (frame / this.pp.getConfig('fps')) + 0.00001;
            this.setSeek(newPos);
        },
        setSeek: function (newpos) {
        },
        setPlay: function () {
        },
        setPause: function () {
        },
        setStop: function () {
            this.detachMedia();
            this._setState('stopped');
            // this._ap=false;
            this.displayItem(false);

        },
        setVolume: function (volume) {
            this.volumeListener(volume);
        },
        setFullscreen: function (inFullscreen) {
            this.sendUpdate('fullscreen', this._isFullscreen);
            this.setResize();
        },
        setResize: function () {
            if (this.element === 'audio' || this.getState('ERROR')) {
                return;
            }
            this._scaleVideo();
        },
        setPosterLive: function () {
        },
        setSrc: function(src) {
            try {
                this.media.file[0].src = src;
            } catch (e) {}
        },
        setQuality: function (quality) {
            if (this._quality === quality) {
                return;
            }

            this._quality = quality;

            try {
                this.applySrc();
            }
            catch (e) {
            }

            this.qualityChangeListener();
        },
        /*******************************
         ELEMENT GETTERS 
         *******************************/
        getId: function () {
            return this.mediaId;
        },
        getQuality: function () {
            return this._quality;
        },
        getVolume: function () {
            return this._volume;
        },
        getLoadProgress: function () {
            return this.media.loadProgress || 0;
        },
        getLoadPlaybackProgress: function () {
            return this.media.playProgress || 0;
        },
        getPosition: function () {
            return this.media.position || 0;
        },
        getFrame: function () {
            return this.media.frame || 0;
        },
        getDuration: function () {
            return this.media.duration || this.pp.getConfig('duration') || 0;
        },
        getMaxPosition: function () {
            return this.media.maxpos || 0;
        },
        getPlaybackQuality: function () {
            return ($.inArray(this._quality, this.media.qualities) > -1) ? this._quality : 'auto';
        },
        getIsFullscreen: function () {
            return this.pp.getIsFullscreen();
        },
        getKbPerSec: function () {
            return this._KbPerSec;
        },
        getState: function (isThis) {
            var result = (this._currentState == null) ? 'IDLE' : this._currentState;
            if (isThis != null) {
                return (result == isThis.toUpperCase());
            }
            return result;
        },
        getBufferState: function (isThis) {
            var result = this._currentBufferState;
            if (isThis != null) {
                return (result === isThis.toUpperCase());
            }
            return result;
        },
        getSeekState: function (isThis) {
            var result = (this._currentSeekState == null) ? 'NONE' : this._currentSeekState;
            if (isThis != null) {
                return (result == isThis.toUpperCase());
            }
            return result;
        },
        getSrc: function () {
            try {
                return this.mediaElement.get(0).currentSrc;
            }
            catch (e) {
            }

            try {
                return this.media.file[0].src;
            }
            catch (e) {
            }

            try {
                return this.getPoster();
            }
            catch (e) {
            }
            return null;
        },
        getModelName: function () {
            return this.modelId || null;
        },
        getMediaElementId: function() {
            try {
                return this.pp.getMediaId() + "_" + this.getModelName().toLowerCase();
            }
            catch(e){
                return "";
            }
        },
        getHasGUI: function () {
            return (this.hasGUI && !this._isPoster);
        },
        getIsReady: function () {
            return this._isReady;
        },
        getPoster: function (type) {
            var type = type || 'poster',
                result = null,
                cfg = this.pp.getConfig(type),
                qual = 'default',
                quals = [];

            if (typeof cfg !== 'object') {
                return cfg;
            }

            for (var i in cfg) {
                if (cfg[i].quality) {
                    quals.push(cfg[i].quality);
                }
            }

            qual = this.pp.getAppropriateQuality(quals);

            for (var j in cfg) {
                if (cfg[j].src != undefined && (cfg[j].quality == qual || result == "" || qual == "default")) {
                    result = cfg[j].src;
                }
            }
            return result;
        },
        getMediaElement: function () {
            return this.mediaElement || $('<video/>');
        },
        getMediaDimensions: function () {
            return {
                width: this.media.videoWidth || 0,
                height: this.media.videoHeight || 0
            };
        },
        getSource: function () {

            var resultSrc = [],
                offset = this.media.offset || this.media.position || false,
                ref = this,
                pseudoQuery = (this.pp.getConfig('streamType') === 'pseudo') ? this.pp.getConfig('startParameter') : false;

            $.each(this.media.file || [], function () {
                var src;
                // set proper quality source
                if (ref._quality !== this.quality && ref._quality !== null)
                    return true;

                // nothing todo 
                if (!pseudoQuery || !offset) {
                    resultSrc.push(this);
                    return true;
                }

                // add offset_GET-parameter
                var u = $p.utils.parseUri(this.src),
                    src = u.protocol + '://' + u.host + u.path,
                    query = [];

                $.each(u.queryKey, function (key, value) {
                    if (key !== pseudoQuery) {
                        query.push(key + "=" + value);
                    }
                });

                src += (query.length > 0) ? '?' + query.join('&') + "&" + pseudoQuery + "=" + offset : "?" + pseudoQuery + "=" + offset;
                this.src = src;

                resultSrc.push(this);
                return true;
            });

            if (resultSrc.length === 0) {
                return this.media.file;
            }
            else {
                return resultSrc;
            }
        },
        /*******************************
         *      ELEMENT LISTENERS
         *******************************/
        timeListener: function (obj) {
            if (typeof obj !== 'object' || obj === null) {
                return;
            }
            
            var position = parseFloat((obj.position || obj.currentTime || this.media.position || 0).toFixed(2)),
                duration = null;
            
            /*
             * When the duration is POSITIVE_INFINITY then we're dealing with a native live stream (e.g. HLS)
             */
            if (obj.duration === Number.POSITIVE_INFINITY && obj.seekable && obj.seekable.length) {
                
                /*
                 * When the seekable.end(0) === POSITIVE_INFINITY we don't have any option to determine DVR window,
                 * so we set _isLive to true and propagate streamTypeChange event with 'live' value
                 */
                if(obj.seekable.end(0) === Number.POSITIVE_INFINITY){
                    // set live and DVR flag to true and propagate streamTypeChange event with 'dvr' value (mainly to the controlbar plugin)
                    if (!this._isLive) {
                        this._isLive = true;
                        this._isDVR = false;
                        this.sendUpdate('streamTypeChange', 'live');
                    }
                }
                /*
                 * Otherwise we've got DVR stream
                 */
                else {
                    // set live and DVR flag to true and propagate streamTypeChange event with 'dvr' value (mainly to the controlbar plugin)
                    if (!this._isDVR && !this._isLive) {
                        this._isLive = true;
                        this._isDVR = true;
                        this.sendUpdate('streamTypeChange', 'dvr');
                    }
                    /*
                     * When seekable.start(0) is >0 the seekable.start is probably set properly (e.g. Safari 7.0.5 on OS X 10.9.4) 
                     * so we could use it to derermine DVR window duration 
                     */
                    if (obj.seekable.start(0) > 0) {
                        duration = parseFloat((obj.seekable.end(0) - obj.seekable.start(0)).toFixed(2));
                    }
                    /*
                     * When seekable.start(0) == 0 then the only way to determine DVR window is to get the first known seekable.end(0) 
                     * value and store it for the whole live session (e.g. Safari 7.0 on iOS 7.1.2).
                     * It's not 100% reliable method, but it's the best estimation we could possibly get.
                     */
                    else {
                        if (obj.seekable.end(0) > 0 && this.media.duration === 0) {
                            duration = parseFloat(obj.seekable.end(0).toFixed(2));
                        }
                        else {
                            duration = this.media.duration;
                        }
                    }
                    position = (duration - (obj.seekable.end(0) - obj.currentTime));
                    position = position < 0 ? 0 : parseFloat(position.toFixed(2));
                }
            }
            /*
             * If duration is a number
             */
            else if (!isNaN(obj.duration)) {
                duration = obj.duration > position ? parseFloat((obj.duration || 0).toFixed(2)) : 0; // Android native browsers tend to report bad duration (1-100s)
            }

            // duration has changed:	
            if (duration !== null && ((duration !== this.media.duration && !this.isPseudoStream) || (this.isPseudoStream && this.media.duration === 0))) {
                this.media.duration = duration;
                this.sendUpdate('durationChange', duration);
            }

            // remember values & concider pseudo stream position offset, bypass some strange position hopping effects during pseudostream:
            if (position === this.media.position) {
                return;
            }

            if (this.isPseudoStream && Math.round(position * 100) / 100 === Math.round(this.media.offset * 100) / 100) {
                this.media.position = this.media.offset;
            }
            else {
                this.media.position = this.media.offset + position;
            }

            this.media.maxpos = Math.max(this.media.maxpos || 0, this.media.position || 0);
            this.media.playProgress = parseFloat((this.media.position > 0 && this.media.duration > 0) ? this.media.position * 100 / this.media.duration : 0);
            this.media.frame = this.media.position * this.pp.getConfig('fps');

            this.sendUpdate('time', this.media.position);

            this.loadProgressUpdate();
        },
        loadProgressUpdate: function () {

            var me = this.mediaElement.get(0),
                progress = 0;

            if (this.media.duration === 0) {
                return;
            }
            if (typeof me.buffered !== 'object') {
                return;
            }
            if (me.buffered.length === 0 && me.seekable.length === 0) {
                return;
            }
            if (this.media.loadProgress === 100) {
                return;
            }

            if (me.seekable && me.seekable.length > 0) {
                progress = Math.round(me.seekable.end(0) * 100 / this.media.duration);
            } else {
                progress = Math.round(me.buffered.end(me.buffered.length - 1) * 100) / this.media.duration;
            }

            if (this.media.loadProgress > progress) {
                return;
            }

            this.media.loadProgress = (this.allowRandomSeek === true) ? 100 : -1;
            this.media.loadProgress = (this.media.loadProgress < 100 || this.media.loadProgress === undefined) ? progress : 100;

            this.sendUpdate('progress', this.media.loadProgress);

        },
        progressListener: function (obj, evt) {

            // we prefer timeranges but keep catching "progress" events by default
            // for historical and compatibility reasons:	
            if (this.mediaElement instanceof jQuery) { // fix this - make sure all instances are jquery objects
                if (typeof this.mediaElement.get(0).buffered === 'object') {
                    if (this.mediaElement.get(0).buffered.length > 0) {
                        this.mediaElement.unbind('progress');
                        return;
                    }
                }
            }

            if (this._bandWidthTimer == null) {
                this._bandWidthTimer = (new Date()).getTime();
            }

            var current = 0,
                total = 0;

            try {
                if (!isNaN(evt.loaded / evt.total)) {
                    current = evt.loaded;
                    total = evt.total;
                } else if (evt.originalEvent && !isNaN(evt.originalEvent.loaded / evt.originalEvent.total)) {
                    current = evt.originalEvent.loaded;
                    total = evt.originalEvent.total;
                }
            } catch (e) {
                if (obj && !isNaN(obj.loaded / obj.total)) {
                    current = obj.loaded;
                    total = obj.total;
                }
            }

            var loadedPercent = (current > 0 && total > 0) ? current * 100 / total : 0;

            if (Math.round(loadedPercent) > Math.round(this.media.loadProgress)) {
                this._KbPerSec = ((current / 1024) / (((new Date()).getTime() - this._bandWidthTimer) / 1000));
            }

            loadedPercent = (this.media.loadProgress !== 100) ? loadedPercent : 100;
            loadedPercent = (this.allowRandomSeek === true) ? 100 : 5 * Math.round(loadedPercent / 5);

            if (this.media.loadProgress != loadedPercent) {
                this.media.loadProgress = loadedPercent;
                this.sendUpdate('progress', loadedPercent);
            }

            // Mac flash fix:
            if (this.media.loadProgress >= 100 && this.allowRandomSeek === false) {
                this._setBufferState('FULL');
            }
        },
        qualityChangeListener: function () {
            this.sendUpdate('qualityChange', this._quality);
        },
        endedListener: function (obj) {
            if (this.mediaElement === null)
                return;
            if (this.media.maxpos <= 0)
                return;
            if (this.getState() === 'STARTING')
                return;
            this._setState('completed');
        },
        waitingListener: function (event) {
            this._setBufferState('EMPTY');
        },
        canplayListener: function (obj) {
            this._setBufferState('FULL');
        },
        canplaythroughListener: function (obj) {
            this._setBufferState('FULL');
        },
        playingListener: function (obj) {
            this._setState('playing');
        },
        pauseListener: function (obj) {
            this._setState('paused');
        },
        fullscreenchangeListener: function(value){
            this.applyCommand('fullscreen', value);
        },
        resizeListener: function(obj) {
            try {
                if(this.media.videoWidth !== obj.videoWidth || this.media.videoHeight !== obj.videoHeight){
                    this.media.videoWidth = obj.videoWidth;
                    this.media.videoHeight = obj.videoHeight;
                    this._scaleVideo();
                }
            }
            catch(e){
                $p.log('resizeListener error', e);
            }
        },
        seekedListener: function (value) {
            this._setSeekState('SEEKED', value || this.media.position);
        },
        volumeListener: function (obj) {
            var newVolume = obj.volume !== void(0) ? parseFloat(obj.volume) : parseFloat(obj);
            if(newVolume !== this._volume) {
                this._volume = newVolume;
                this.sendUpdate('volume', newVolume);
            }
        },
        errorListener: function (event, obj) {
        },
        nullListener: function (obj) {
        },
        applySrc: function () {
        },
        applyImage: function (url, destObj) {

            var imageObj = $('<img/>').hide(),
                currentImageObj = $("." + this.pp.getMediaId() + "_image"),
                // select by class to workaround timing issues causing multiple <img> of the same ID being present in the DOM
                ref = this;

            $p.utils.blockSelection(imageObj);

            // empty URL... apply placeholder
            if (url == null || url === false) {
                currentImageObj.remove();
                return $('<img/>').attr({
                    "id": this.pp.getMediaId() + "_image",
                    "src": $p.utils.imageDummy()
                }).appendTo(destObj);
            }

            // no changes
            if ($(currentImageObj[0]).attr('src') == url) {
                if ($p.utils.stretch(ref.pp.getConfig('imageScaling'), $(currentImageObj[0]), destObj.width(), destObj.height())) {
                    try {
                        ref.sendUpdate('scaled', {
                            originalWidth: currentImageObj._originalDimensions.width,
                            originalHeight: currentImageObj._originalDimensions.height,
                            scaledWidth: ref.mediaElement.width(),
                            scaledHeight: ref.mediaElement.height(),
                            displayWidth: destObj.width(),
                            displayHeight: destObj.height()
                        });
                    } catch (e) {
                    }
                }
                return $(currentImageObj[0]);
            }

            imageObj.load(function (event) {
                var target = $(event.currentTarget),
                    imgObj;

                if (!imageObj.attr("data-od-width"))
                    imageObj.attr("data-od-width", target[0].naturalWidth);
                if (!imageObj.attr("data-od-height"))
                    imageObj.attr("data-od-height", target[0].naturalHeight);

                currentImageObj.remove();

                imageObj.attr('id', ref.pp.getMediaId() + "_image");
                imageObj.show();

                if ($p.utils.stretch(ref.pp.getConfig('imageScaling'), target, destObj.width(), destObj.height())) {
                    try {
                        ref.sendUpdate('scaled', {
                            originalWidth: imgObj._originalDimensions.width,
                            originalHeight: imgObj._originalDimensions.height,
                            scaledWidth: ref.mediaElement.width(),
                            scaledHeight: ref.mediaElement.height(),
                            displayWidth: destObj.width(),
                            displayHeight: destObj.height()
                        });
                    } catch (e) {
                    }
                }
            });

            imageObj.removeData('od');

            this.pp.removeListener('fullscreen.poster');
            this.pp.removeListener('resize.poster');

            this.pp.addListener('fullscreen.poster', function () {
                ref.applyImage(ref.getPoster(), destObj);
            });

            this.pp.addListener('resize.poster', function () {
                ref.applyImage(ref.getPoster(), destObj);
            });

            imageObj.appendTo(destObj).attr({
                "alt": this.pp.getConfig('title') || ''
            }).css({
                position: 'absolute'
            }).addClass(this.pp.getMediaId() + "_image");

            // IE<9 trap:
            imageObj.attr('src', url);

            imageObj.error(function (event) {
                $(this).remove();
                currentImageObj.show();
            });

            return imageObj;
        },
        _setState: function (state) {
            var ref = this,
                state = state.toUpperCase(),
                old = this._currentState;

            this._currentState = state.toUpperCase();

            if (old !== state && old !== 'ERROR') {
                if (old === 'PAUSED' && state === 'PLAYING') {
                    this.sendUpdate('resume', this.media);
                    this._isPlaying = true;
                }

                if ((old === 'IDLE' || old === 'STARTING') && state === 'PLAYING') {
                    this.sendUpdate('start', this.media);
                    this._isPlaying = true;
                }

                if (state === 'PAUSED') {
                    this._isPlaying = false;
                    this._setBufferState('FULL');
                }

                if (state === 'ERROR') {
                    this.setPlay = this.setPause = function () {
                        ref.sendUpdate('start');
                    };
                }

                this.sendUpdate('state', this._currentState);
            }
        },
        _setBufferState: function (state) {
            if (this._currentBufferState !== state.toUpperCase()) {
                this._currentBufferState = state.toUpperCase();
                this.sendUpdate('buffer', this._currentBufferState);
            }
        },
        _setSeekState: function (state, value) {
            if (this._currentSeekState !== state.toUpperCase()) {
                this._currentSeekState = state.toUpperCase();
                this.sendUpdate('seek', this._currentSeekState, value);
            }
        },
        _scaleVideo: function () {
            var mediaDisplay = this.pp.getMediaContainer(),
                displayWidth, displayHeight,
                videoWidth, videoHeight;

            try {
                displayWidth = mediaDisplay.width();
                displayHeight = mediaDisplay.height();
                videoWidth = this.media.videoWidth;
                videoHeight = this.media.videoHeight;

                if (this.mediaElement.attr("data-od-width") != videoWidth) {
                    this.mediaElement.attr("data-od-width", videoWidth);
                }
                if (this.mediaElement.attr("data-od-height") != videoHeight) {
                    this.mediaElement.attr("data-od-height", videoHeight);
                }

                if ($p.utils.stretch(this.pp.getConfig('videoScaling'), this.mediaElement, displayWidth, displayHeight)) {
                    this.sendUpdate('scaled', {
                        originalWidth: videoWidth,
                        originalHeight: videoHeight,
                        scaledWidth: this.mediaElement.width(),
                        scaledHeight: this.mediaElement.height(),
                        displayWidth: displayWidth,
                        displayHeight: displayHeight
                    });
                }
            } catch (e) {
                $p.utils.log('_scaleVideo error', e);
            }
        }
    };
});