/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * Copyright 2014-2015 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 * 
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */
jQuery(function($) {
$p.newModel({

    modelId: 'OSMFVIDEO',
    
    flashVersion: '11.4',
    
    platform: 'flash',
    //minPlatformVersion: '11.4',
    
    iLove: [
        {ext:'flv', type:'video/flv', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'mp4', type:'video/mp4', platform:'flash', streamType: ['*']},
        {ext:'f4v', type:'video/mp4', platform:'flash', streamType: ['*']},
        {ext:'mov', type:'video/quicktime', platform:'flash', streamType: ['*']},
        {ext:'m4v', type:'video/mp4', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'f4m', type:'application/f4m+xml', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'m3u8', type:'application/x-mpegurl', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'manifest', type:'application/vnd.ms-ss', platform:'flash', fixed: true, streamType: ['*']}
    ],

    hasGUI: false,    
    isPseudoStream: false,
    streamType: 'http',
    
    availableQualities: {},
    
    _hardwareAcceleration: true,
    _isMuted: false,
    _qualitySwitching: false,
    _isDynamicStream: false,
    _requestedDynamicStreamIndex: -1, // inited with "auto switch" value to indicate that no index was manually requested
    _volume: 0,
    _bufferTime: 0,
    _cbTimeout: null, // clear buffer timeout id

    _eventMap: {
        // org.osmf.events.AudioEvent, org.osmf.traits.AudioTrait
        volumeChange: "volumeListener",
        
        // org.osmf.events.BufferEvent, org.osmf.traits.BufferTrait
        bufferingChange: "OSMF_bufferingChange",
        bufferTimeChange: "OSMF_bufferTimeChange",
        
        // org.osmf.events.DisplayObjectEvent, org.osmf.traits.DisplayObjectTrait
        mediaSizeChange: "OSMF_mediaSizeChange",
        
        // org.osmf.events.LoadEvent, org.osmf.traits.LoadTrait, org.osmf.traits.LoadState
        loadStateChange: "OSMF_loadStateChange",
        bytesLoadedChange: "OSMF_bytesLoadedChange",
        
        // org.osmf.events.MediaErrorEvent, org.osmf.events.MediaErrorCodes
        mediaError: "errorListener",
        
        // org.osmf.events.MediaPlayerCapabilityChangeEvent, org.osmf.media.MediaPlayer
        canSeekChange: "OSMF_canSeekChange",
        canPlayChange: "OSMF_seekingChange", 
        
        // org.osmf.events.PlayEvent, org.osmf.traits.PlayTrait, org.osmf.traits.PlayState
        playStateChange: "OSMF_playStateChange",
        
        // org.osmf.events.SeekEvent, org.osmf.traits.SeekTrait
        seekingChange: "OSMF_seekingChange",

        // org.osmf.events.TimeEvent, org.osmf.traits.TimeTrait
        durationChange: "OSMF_durationChange",
        currentTimeChange: "OSMF_currentTimeChange",
        complete: "endedListener",

        /**
         * Dynamic Streams / quality switching
         */ 
            // org.osmf.events.MediaPlayerCapabilityChangeEvent
        isDynamicStreamChange: "OSMF_isDynamicStreamChange",

            // org.osmf.traits.DynamicStreamTrait
        autoSwitchChange: "OSMF_autoSwitchChange", // Dispatched when the autoSwitch property changed.
        numDynamicStreamsChange: "OSMF_numDynamicStreamsChange", // Dispatched when the number of dynamic streams has changed.
        switchingChange: "OSMF_switchingChange" // Dispatched when a stream switch is requested, completed, or failed.
    },    
    
    /**
     * org.osmf.display.ScaleMode
     * 
     * none - implies that the media size is set to match its intrinsic size
     * 
     * letterbox - sets the width and height of the content as close to the container width and height
     * as possible while maintaining aspect ratio.  The content is stretched to a maximum of the container bounds, 
     * with spacing added inside the container to maintain the aspect ratio if necessary.
     * 
     * zoom - is similar to letterbox, except that zoom stretches the
     * content past the bounds of the container, to remove the spacing required to maintain aspect ratio.
     * This has the effect of using the entire bounds of the container, but also possibly cropping some content.
     * 
     * stretch - (unused) sets the width and the height of the content to the
     * container width and height, possibly changing the content aspect ratio.
     */
    _scalingMap: {
        none: 'none',
        fill: 'zoom',
        aspectratio: 'letterbox'
    },
    
    /**
     * org.osmf.net.StreamType
     * 
     * Maps projekktor internal streamType values to the OSMF's ones.
     * 
     * live - represents a live stream
     * recorded - represents a recorded stream
     * liveOrRecorded - represents a live or a recorded stream
     * dvr - represents a possibly server side recording live stream
     * 
     */
    _streamTypeMap: {
        '*': 'liveOrRecorded',
        'rtmp': 'liveOrRecorded',
        'live': 'live',
        'httpLive': 'live',
        'httpVideoLive': 'live',
        'httpAudioLive': 'live',
        'http' : 'recorded',
        'httpVideo': 'recorded',
        'httpAudio': 'recorded',
        'pseudo': 'recorded',
        'dvr': 'dvr'
    },
    
    applyMedia: function(destContainer) {
        var ref = this,
            ppId = ref.pp.getId(),
            ppMediaId = ref.pp.getMediaId();
        
        // register global listener
        window['projekktorOSMFReady' + ppId] = function() {
            projekktor(ppId).playerModel._OSMFListener(arguments);
        };     

        destContainer
            .html('')
            .css({
                'width': '100%',
                'height': '100%',
                'position': 'absolute',
                'top': 0,
                'left': 0
            });
        
        var config = {
            src: this.pp.getConfig('platformsConfig').flash.src,
            attributes: {
                id: ppMediaId + "_flash",
                name: ppMediaId + "_flash",
                width: '100%',
                height: '100%',
                style: "position: absolute;"
            },
            parameters: {
                allowScriptAccess: "always",
                quality: "high", 
                menu: false,
                allowFullScreen: "true",
                wmode: ($p.utils.ieVersion() < 9) ? 'transparent' : 'opaque', // must be either transparent (ie) or opaque in order to allow HTML overlays
                seamlessTabbing: 'false',
                bgcolor: '#000000'
            },
            // FlashVars
            initVars: $.extend({
                src: this.getSource()[0].src,
                mimeType: this.getSource()[0].originalType,
                streamType: this._streamTypeMap[this.pp.getConfig('streamType')],
                scaleMode: this._scalingMap[this.pp.getConfig('videoScaling')],
                autoPlay: false,
                urlIncludesFMSApplicationInstance: this.pp.getConfig('rtmpUrlIncludesApplicationInstance'),
                enableStageVideo: this._hardwareAcceleration,
                javascriptCallbackFunction: 'window.projekktorOSMFReady' + ppId
            }, this.pp.getConfig('platformsConfig').flash.initVars || {})
        };

        this.mediaElement = $p.utils.embedPlugin(this.platform, destContainer, config, true);
    },

    addOSMFEventListeners: function() {
        var ref = this;
        $.each(this._eventMap, function(key, value){
            ref.mediaElement[0].addEventListener(key, "projekktor('" + ref.pp.getId() + "').playerModel." + value);
        });
    },
    
    addListeners: function() {}, 
    
    removeListeners: function() {},
    
    loadProgressUpdate: function () {},
        
    applyMediaConfig: function() {
        var ref = this,
            sources = this.getSource();
        
        this.streamType = sources[0].streamType || this.pp.getConfig('streamType') || 'http';
        
        if (this.getState('PLAYING')) {
            this.setPlay();
            if (ref.isPseudoStream!==true && this.media.position>0) {
                this.setSeek(this.media.position);
            }
        }
        
        if(this.streamType=='pseudo') {
            this.isPseudoStream = true;
            this.allowRandomSeek = true;
            this.media.loadProgress = 100;
        }

        if (this.streamType.indexOf('live')>-1 ) {
            this.allowRandomSeek = true;
            this.media.loadProgress = 100;
        }
        
        return true;
    }, 

    _OSMFListener: function() {
        var mediaId = arguments[0][0],
            event = arguments[0][1],
            value = arguments[0][2],
            ref = this;
        
        if(!this.mediaElement){
            this.mediaElement = $('#' +  mediaId); // IE 10 sucks
        }

        switch(event) {
            case 'onJavaScriptBridgeCreated':
                if (this.mediaElement !== null && (this.getState('AWAKENING') || this.getState('STARTING'))) {
                    // add OSMF event listeners
                    this.addOSMFEventListeners();
                    this.applyMediaConfig();
                    this.displayReady();
                }
            break;
        }
    },

    OSMF_bytesLoadedChange: function(value) {
        this.progressListener({loaded:this.getBytesLoaded(), total:this.getBytesTotal()});
    },
        
    OSMF_durationChange: function(value) {
        var duration = isNaN(value) ? 0 : value;
        this.timeListener({position: this.media.position, duration: duration || 0 });
        this.seekedListener();
    },
    
    OSMF_currentTimeChange: function(value) {
        var time = isNaN(value) ? 0 : value;

        this.timeListener({position: time, duration: this.media.duration || 0 });
    },
    
    OSMF_seekingChange: function(value) {
        this.seekedListener(value);
    },
    
    OSMF_canSeekChange: function(value) {
        if(value){
            this.allowRandomSeek = true;        
            this.media.loadProgress = 100;
        }
        else {
            this.allowRandomSeek = false;
        }
    },
    
    OSMF_bufferingChange: function(state) {
        if (state===true) 
            this.waitingListener();
        else
            this.canplayListener();
    },    
    
    OSMF_bufferTimeChange: function(value) {
        if (isNaN(value)){
            this._bufferTime = 0;
        }
        else {
            this._bufferTime = value;
        }
    },
    
    OSMF_mediaSizeChange: function(newWidth, newHeight) {
        if (isNaN(newWidth) || isNaN(newHeight)) return;
        
        this.resizeListener({videoWidth:newWidth, videoHeight:newHeight});
    },
    
    /**
     * Listen to the org.osmf.events.LoadEvent.LOAD_STATE_CHANGE events
     * dispatched when the properties of a org.osmf.traits.LoadTrait change.
     * 
     * @param {string} state - one of the LoadState values defined in defined in org.osmf.traits.LoadState:
     *                         "uninitialized" - the LoadTrait has been constructed, but either has not yet started loading or has been unloaded.
     *                         "loading" - the LoadTrait has begun loading.
     *                         "unloading" - the LoadTrait has begun unloading.
     *                         "ready" - the LoadTrait is ready for playback.
     *                         "loadError" - the LoadTrait has failed to load.
     *                 
     */
    OSMF_loadStateChange: function(state) {
        
        switch (state) {
            case 'loading':        
                this.waitListener();
                break;
                
            case 'ready':
                if (this.getState('awakening')) {
                    // this.displayReady();
                }            
                if (this.getState('starting')) {
                    this.setPlay();
                }
                if (this.mediaElement[0].getStreamType().indexOf('dvr')>-1) {
                    this.allowRandomSeek = true;
                    this.media.loadProgress = 100;
                }                        
                break;

            case 'loadError':
                //TODO: prevent false positives in the case of dynamically loaded plugins
                this.errorListener(80);
            break;            
        }
    },
    
    /**
     * Listen to the org.osmf.events.PlayEvent.PLAY_STATE_CHANGE events
     * dispatched when the properties of a org.osmf.traits.PlayTrait change.
     * 
     * @param {string} state - one of the state values defined in org.osmf.traits.PlayState: playing, paused, stopped
     */
    OSMF_playStateChange: function(state) {
        var ref = this;
        
        // getIsDVR & getIsDVRLive seem to be broken - workaround:
        if (!this._isDVR && this.mediaElement[0].getStreamType()=='dvr') {
            this._isDVR = true;
            this.sendUpdate('streamTypeChange', 'dvr');
        }
        
        switch(state) {
            case 'playing':
                this.playingListener();
                break;
            case 'paused':            
                this.pauseListener();
                if (this._isDVR) {
                    // simulate sliding time window:
                    (function() {
                        if (ref.getState('PAUSED')) {
                            if (ref.media.position>=0.5) {
                                ref.timeListener({position: ref.media.position-0.5, duration: ref.media.duration || 0 });
                                setTimeout(arguments.callee, 500);
                            }
                        }
                    })();
                }
                break;
            case 'stopped':
                if (!this.getSeekState('SEEKING')) {
                    this.endedListener();
                }
                break;
        }
    },    
    
    OSMF_isDynamicStreamChange: function(value) {
        this.getDynamicStreamingStatus('OSMF_isDynamicStreamChange');
        this._isDynamicStream = value;
    },
    
    OSMF_autoSwitchChange: function() {
         this.getDynamicStreamingStatus('OSMF_autoSwitchChange');
    },
    
    OSMF_numDynamicStreamsChange: function(){
         this.getDynamicStreamingStatus('OSMF_numDynamicStreamsChange');
         
         // Note: update available dynamic stream qualities should be performed only after OSMF 'numDynamicStreamsChange' event.
         // Strobe Media Playback getStreamItems() method can sometimes return wrong random width & hight values if it's called later.
         this.updateAvailableDynamicStreamsQualities();
    },
    
    OSMF_switchingChange: function(){
        this.getDynamicStreamingStatus('OSMF_switchingChange');
        
        this.qualityChangeListener();
        
        // Flush the buffer only when the switch to the requested index was succesfully performed, otherwise the Strobe Media Playback will hang
        // and stop reacting on manual quality switch requests. We never flush buffer if 'auto switch' (index < 0) was requested.
        if(this._requestedDynamicStreamIndex >= 0 && this.getCurrentDynamicStreamIndex() === this._requestedDynamicStreamIndex){
            this.clearBuffer();
        }
    },
    
    /**
     * Update projekktor internal quality keys for currently active playlist item
     * with Strobe Media Playback dynamic stream item values
     * 
     * To use different quality keys format than default:
     * audio/video key: '%{height}p | %{bitrate}kbps'
     * audio-only key: 'audio | %{bitrate}kbps'
     * 
     * set 'dynamicStreamQualityKeyFormatAudioVideo', 'dynamicStreamQualityKeyFormatAudioOnly' config options respectively.
     * 
     * To show audio-only qualities set 'dynamicStreamShowAudioOnlyQualities' config option to true (default: false)
     * 
     * Note: Quality keys must have unique names, otherwise they will be overwriten.
     * 
     * @returns {Array} - returns available dynamic streams quality keys in the projekktor's format
     */
    updateAvailableDynamicStreamsQualities: function() {

        var dynamicStreams = this.getStreamItems(),
            numStreams = dynamicStreams.length,
            keyName = '',
            isAudioOnly = false,
            showAudioOnly = this.pp.getConfig('dynamicStreamShowAudioOnlyQualities'),
            avKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioVideo'),
            aoKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioOnly'),
            bitrate = 0,
            bitrateKbps = 0,
            bitrateMbps = 0,
            bitrateUnit = 'kbps',
            qualityKeys = [];
    
        this.availableQualities = {};

        for (var i=0; i < numStreams; i++){
            if (dynamicStreams[i].bitrate !== undefined) {
                
                bitrateKbps = Math.floor(dynamicStreams[i].bitrate);
                bitrateMbps = Math.round(bitrateKbps/1000);
                bitrate = bitrateKbps < 1000 ? bitrateKbps : bitrateMbps;
                bitrateUnit = bitrateKbps < 1000 ? 'kbps' : 'Mbps';
                
                // audio/video stream quality
                if(dynamicStreams[i].height > 0){
                    isAudioOnly = false;
                    keyName = $p.utils.parseTemplate(avKeyFormat , {
                                    height: dynamicStreams[i].height,
                                    width: dynamicStreams[i].width,
                                    bitrate: bitrate,
                                    bitrateunit: bitrateUnit,
                                    bitratekbps: bitrateKbps,
                                    bitratembps: bitrateMbps
                            });
                }
                // audio-only stream quality
                else {
                    isAudioOnly = true;
                    if(showAudioOnly){
                        keyName = $p.utils.parseTemplate(aoKeyFormat , {
                                    bitrate: bitrate,
                                    bitrateunit: bitrateUnit,
                                    bitratekbps: bitrateKbps,
                                    bitratembps: bitrateMbps
                        });
                    }
                }
                
                if(keyName.length && (isAudioOnly === showAudioOnly)){
                    this.availableQualities[keyName] = i;
                    qualityKeys.push(keyName);
                }
            }
        }
        
        // always add auto
        qualityKeys.push('auto');
        
        this._isDynamicStream = true; // important: set this before sending the update
        
        this.sendUpdate('availableQualitiesChange', qualityKeys);
        return qualityKeys;
    },
    
    /**
     * Switch to a specific dynamic stream index.
     * 
     * @param {int} index - if < 0 then the automatic stream switch will be enabled, 
     * otherwise if the index value is a valid stream index the manual switch will be performed
     * 
     * @returns {mixed} - if the requested index is invalid, is the same as current index or is out of valid range function returns false
     * otherwise it returns requested index value. 
     * Note: Always use strict comparison when using return value cause the lowes valid index could be 0.
     * 
     * Note:  If the media is paused, switching will not take place until after play resumes.
     */
    switchDynamicStreamIndex: function(index) {
        // return if the index is NaN or is the current index or is out of range
        if((isNaN(index) || (index < 0 && this.getAutoDynamicStreamSwitch()) || (index === this.getCurrentDynamicStreamIndex() && !this.getAutoDynamicStreamSwitch()) || index > this.getMaxAllowedDynamicStreamIndex())) return false;
        
        this._requestedDynamicStreamIndex = index;
        
        this.getDynamicStreamingStatus('before switch');
        
        // auto quality switching if requested index is < 0
        if (index < 0) {
           this.setAutoDynamicStreamSwitch(true);
        }
        // manual quality switching
        else {
            // auto dynamic stream switch must be set to false before any attempt of manual index switching
            this.setAutoDynamicStreamSwitch(false);
            
            // if there is atempt to manual switch but after disabling auto switching current index is already the requested one (without that check the player tend to hang)
            if(index !== this.getCurrentDynamicStreamIndex()){
                this.mediaElement[0].switchDynamicStreamIndex(index);
            }
        }
        
        this.getDynamicStreamingStatus('after switchDynamicStreamIndexTo');
        
        return index;
    },
    
    getStreamItems: function() {
        return this.mediaElement[0].getStreamItems();
    },
    
    getNumDynamicStreams: function() {
        return this.mediaElement[0].getNumDynamicStreams();
    },
    
    /**
     * The maximum allowed index. This can be set at run-time to 
     * provide a ceiling for the switching profile, for example,
     * to keep from switching up to a higher quality stream when 
     * the current video is too small to handle a higher quality stream.
     * 
     * The default is the highest stream index.
     */
    getMaxAllowedDynamicStreamIndex: function() {
        return this.mediaElement[0].getMaxAllowedDynamicStreamIndex();
    },
    
    setMaxAllowedDynamicStreamIndex: function(val){
        if(!isNaN(val) && val !== this.getMaxAllowedDynamicStreamIndex() && val >= 0 && val < this.getNumDynamicStreams()){
            this.mediaElement[0].setMaxAllowedDynamicStreamIndex(val);
        }
    },
    
    /**
     * The index of the current dynamic stream. Uses a zero-based index.
     */
    getCurrentDynamicStreamIndex: function() {
        return this.mediaElement[0].getCurrentDynamicStreamIndex();
    }, 
    
    /**
     * Defines whether or not the model should be in manual 
     * or auto-switch mode. If in manual mode the switchDynamicStreamIndex
     * method can be used to manually switch to a specific stream index.
     */
    getAutoDynamicStreamSwitch: function() {
        return this.mediaElement[0].getAutoDynamicStreamSwitch();
    },
    
    setAutoDynamicStreamSwitch: function(val) {
        if(val){ // enable auto stream switching
            this.mediaElement[0].setAutoDynamicStreamSwitch(true);
        }
        else { // disable auto stream switching
            if(this.mediaElement[0].getAutoDynamicStreamSwitch()) { 
                this.mediaElement[0].setAutoDynamicStreamSwitch(false);  
            }
        }
    },
    
    /**
     * Indicates whether or not a switch is currently in progress.
     * This property will return true while a switch has been 
     * requested and the switch has not yet been acknowledged and no switch failure 
     * has occurred. Once the switch request has been acknowledged or a 
     * failure occurs, the property will return false.
     */
    getDynamicStreamSwitching: function() {
        return this.mediaElement[0].getDynamicStreamSwitching();
    },
    
    getCanSeek: function() {
        return this.mediaElement[0].getCanSeek();
    },
    
    canSeekTo: function(value) {
        return this.mediaElement[0].canSeekTo(value);
    },
    
    goToLive: function() {
        
    },
    
    getLivePosition: function() {
        var smp = this.mediaElement[0];
        return Math.max(smp);
    },
    
    /**
     * Force-clearing the buffer after dynamic stream index (bitrate) change.
     */
    clearBuffer: function(){
        var ref = this;
        // always give it some delay to prevent multiple flushes in a short time
        clearTimeout(this._cbTimeout);
        
        this._cbTimeout = setTimeout(function(){
            // Perform a seek to the current time so we force an immediate quality switch
            var currentTime = ref.mediaElement[0].getCurrentTime();

            if(ref.getCanSeek() && ref.canSeekTo(currentTime)){
                ref.mediaElement[0].seek(currentTime);
            }
            ref.getDynamicStreamingStatus('after clear buffer');
        }, 200);
    },
    
    getDynamicStreamingStatus: function(name){
        if($p.utils.logging){
            $p.utils.log('| ' + name + ' | ' + arguments.callee.name + ' ===');
            $p.utils.log(
                           '| reqIdx: ', this._requestedDynamicStreamIndex ,
                           ', current index: ', this.getCurrentDynamicStreamIndex(), 
                           ', max allowed index: ', this.getMaxAllowedDynamicStreamIndex(), 
                           ', num streams: ', this.getNumDynamicStreams(), 
                           ', auto:', this.getAutoDynamicStreamSwitch(), 
                           ', is switching:',  this.getDynamicStreamSwitching()
                        );
            var streams = this.getStreamItems();
            for (var index in streams) {
                if(streams.hasOwnProperty(index) && streams[index].bitrate !== undefined){
                    name = index + ' dimensions: ' + streams[index].width + "x" + streams[index].height + " | bitrate: " + streams[index].bitrate + ' | streamName: ' + streams[index].streamName;
                    $p.utils.log('| ' + name);
                }
            }
            $p.utils.log('| ======================================');
        }
    },
    
    errorListener: function() {
        var errorId = arguments[0],
            errorMsg = arguments[1];

        /* todo OSMF MediaErrorCodes mapping http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/org/osmf/events/MediaErrorCodes.html */
        switch (errorId) {
            case 15:
                this.sendUpdate('error', 5, errorMsg);
                break;
            case 16:
                this.sendUpdate('error', 80, errorMsg);
                break;                    
            case 80:
            case 7:
                this.sendUpdate('error', 80, errorMsg);
                break;                
            default:
                this.sendUpdate('error', 0);
                break;
        }
    },
    
    detachMedia: function() {
        var ppId = this.pp.getId();
        // delete global listeners functions
        delete window['projekktorOSMFReady' + ppId];
        
        try {
            this.mediaElement[0].remove();
        } 
        catch(e){}           
    },
    
    volumeListener: function (volume) {
        this._volume = volume;      
    },    
    
    endedListener: function (obj) {
        if (this.mediaElement === null) return;
        if (this.media.maxpos <= 0) return;
        if (this.getState('STARTING')) return;
        if (this._qualitySwitching===true) return;
        this._setState('completed');
    },    
    
    /************************************************
     * setters
     ************************************************/
    
    setSeek: function(newpos) {
        if (this.isPseudoStream) {
            this._setSeekState('seeking');
            this.media.offset = newpos;
            this.applySrc();
            return;
        }
        
        // snap to live position
        if (newpos < 0) {
            this.mediaElement[0].snapToLive();
        }
        else {
            this.mediaElement[0].seek(newpos);
        }
    },
    
    setVolume: function(newvol) {
        if (this.mediaElement === null) {
            this.volumeListener(newvol);
        }
        else {
            this.mediaElement[0].setVolume(newvol);
        }
    },
    
    setPause: function() {
        this.mediaElement[0].pause();
    },
    
    setPlay: function() {
        this.mediaElement[0].play2();
    },
    
    setQuality: function (quality) {
        if (this._quality == quality) return;
        this._quality = quality;
        
        // dynamic streams
        if (this._isDynamicStream === true) {
            this.switchDynamicStreamIndex( (quality=='auto') ? -1 : this.availableQualities[quality] );
            return;
        }
        
        this._qualitySwitching = true;
        this.applySrc();
        this._qualitySwitching = false;
        this.qualityChangeListener();
    },

    /************************************************
     * getters
     ************************************************/
    getVolume: function() {
        if (this._isMuted===true)
            return 0;
        
        if (this.mediaElement===null)
            return this.media.volume;
    
        return this._volume;
    },
    
    getSrc: function () {
        try {
            return this.mediaElement[0].getCurrentSrc();
        } catch(e) {return null;}
    },
    
    getQuality: function () {
        return this._quality;
    },
    
    // org.osmf.media.MediaPlayer
    getBytesLoaded: function() {
        if (this.mediaElement!==null){
            return this.mediaElement[0].getBytesLoaded();
        }
        else {
            return 0;
        }
    },
    
    getBytesTotal: function() {
        if (this.mediaElement!==null){
            return this.mediaElement[0].getBytesTotal();
        }
        else {
            return 0;
        }
    }
});

$p.newModel({    

    modelId: 'OSMFAUDIO',
    
    hasGUI: false,
    iLove: [
        {ext:'mp3', type:'audio/mp3', platform:'flash', streamType: ['*']},
        {ext:'m4a', type:'audio/mp4', platform:'flash', streamType: ['*']},
        {ext:'m4a', type:'audio/mpeg', platform:'flash', streamType: ['*']},
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform: 'flash', streamType: ['*']},
        {ext:'m3u', type:'application/vnd.apple.mpegurl', platform: 'flash', streamType: ['*']},             
        {ext:'m3u8', type:'application/x-mpegurl', platform: 'flash', streamType: ['*']},
        {ext:'m3u', type:'application/x-mpegurl', platform: 'flash', streamType: ['*']},    
        {ext:'m3u8', type:'audio/mpegurl', platform: 'flash', streamType: ['*']},
        {ext:'m3u', type:'audio/mpegurl', platform: 'flash', streamType: ['*']},
        {ext:'m3u8', type:'audio/x-mpegurl', platform: 'flash', streamType: ['*']},
        {ext:'m3u', type:'audio/x-mpegurl', platform: 'flash', streamType: ['*']}
    ],
    
    applyMedia: function(destContainer) {
        var ref = this,
            ppId = ref.pp.getId(),
            ppMediaId = ref.pp.getMediaId();
        
        $p.utils.blockSelection(destContainer);        

        // create image element
        this.imageElement = this.applyImage(this.getPoster('cover') || this.getPoster('poster'), destContainer);
            
        var flashContainer = $('#' + ppMediaId + '_flash_container');
        
        if (flashContainer.length===0) {
            flashContainer = $(document.createElement('div'))
            .css({width: '1px', height: '1px'})
            .attr('id', ppMediaId + "_flash_container")
            .prependTo( this.pp.getDC() );        
        }
        
        window['projekktorOSMFReady' + ppId] = function() {
            projekktor(ppId).playerModel._OSMFListener(arguments);
        };   
        
        var config = {
            src: this.pp.getConfig('platformsConfig').flash.src,
            attributes: {
                id: ppMediaId + "_flash",
                name: ppMediaId + "_flash",
                width: '100%',
                height: '100%',
                style: "position: absolute;"
            },
            parameters: {
                allowScriptAccess: "always",
                quality: "high", 
                menu: false,
                allowFullScreen: "true",
                wmode: ($p.utils.ieVersion() < 9) ? 'transparent' : 'opaque', // must be either transparent (ie) or opaque in order to allow HTML overlays
                seamlessTabbing: 'false',
                bgcolor: '#000000'
            },
            initVars: $.extend({
                javascriptCallbackFunction: 'window.projekktorOSMFReady' + ppId               
            }, this.pp.getConfig('platformsConfig').flash.initVars || {})
        };
        
        this.mediaElement = $p.utils.embedPlugin(this.platform, flashContainer, config, false);
    }
    
}, 'OSMFVIDEO');
});