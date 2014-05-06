/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */
jQuery(function($) {
$p.newModel({

    modelId: 'OSMFVIDEO',
    replace: 'VIDEOFLASH',
   
    flashVersion: "10.2",
    flashVerifyMethod: 'addEventListener',
    
    iLove: [
        {ext:'flv', type:'video/flv', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'mp4', type:'video/mp4', platform:'flash', streamType: ['*']},
        {ext:'f4v', type:'video/mp4', platform:'flash', streamType: ['*']},
        {ext:'mov', type:'video/quicktime', platform:'flash', streamType: ['*']},
        {ext:'m4v', type:'video/mp4', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'f4m', type:'application/f4m+xml', platform:'flash', fixed: true, streamType: ['*']},
        /*{ext:'m3u8', type:'application/mpegURL', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'m3u8', type:'application/x-mpegURL', platform:'flash', fixed: true, streamType: ['*']},
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform:'flash', fixed: true, streamType: ['*']},*/
        {ext:'manifest', type:'application/vnd.ms-ss', platform:'flash', fixed: true, streamType: ['*']}
    ],

    hasGUI: false,    
    allowRandomSeek: false,
    isPseudoStream: false,
    streamType: 'http',
    
    availableQualities: {},
    
    _hardwareAcceleration: true,
    _isStream: false,
    _isDVR: false,
    _isMuted: false,
    _qualitySwitching: false,
    _isDynamicStream: false,
    _requestedDynamicStreamIndex: -1, // inited with "auto switch" value to indicate that no index was manually requested
    _volume: 0,
    _cbTimeout: null,

    _eventMap: {
        //  mediaPlayerStateChange: "OSMF_playerStateChange", obsolete
        mediaPlayerCapabilityChange: "OSMF_PlayerCapabilityChange",
        durationChange: "OSMF_durationChange",
        currentTimeChange: "OSMF_currentTimeChange",
        loadStateChange: "OSMF_loadStateChange",
        bufferingChange: "OSMF_bufferingChange",
        bytesLoadedChange: "OSMF_bytesLoadedChange",
        playStateChange: "OSMF_playerStateChange",
        seekingChange: "OSMF_seekingChange",
        canPlayChange: "OSMF_seekingChange",
        canSeekChange: "OSMF_canSeekChange",
        
        isRecordingChange: "OSMF_isRecordingChange",
        complete: "endedListener",
        volumeChange: "volumeListener",
        mediaError: "errorListener",
        MBRItemChange: "OSMF_universal",
        
        // Dynamic Streams
        
        isDynamicStreamChange: "OSMF_isDynamicStreamChange",
        
        // org.osmf.traits.DynamicStreamTrait
        autoSwitchChange: "OSMF_autoSwitchChange", // Dispatched when the autoSwitch property changed.
        numDynamicStreamsChange: "OSMF_numDynamicStreamsChange", // Dispatched when the number of dynamic streams has changed.
        switchingChange: "OSMF_switchingChange" // Dispatched when a stream switch is requested, completed, or failed.
        
        
        
    },    
    
    _scalingMap: {
        none: 'none',
        fill: 'zoom',
        aspectratio: 'letterbox'
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
        
        var domOptions = {
            id: ppMediaId + "_flash",
            name: ppMediaId + "_flash",
            src: this.pp.getConfig('playerFlashMP4'),
            width: '100%',
            height: '100%',
            style: "position: absolute;",
            allowScriptAccess: "always",
            quality: "high", 
            menu: false,
            allowFullScreen: 'true',
            wmode: ($p.utils.ieVersion() < 9) ? 'transparent' : 'opaque', // must be either transparent (ie) or opaque in order to allow HTML overlays
            SeamlessTabbing: 'false',
            bgcolor: '#000000',
            FlashVars: $.extend({
                // streamType: this.pp.getConfig('streamType', ''), // "dvr", //  "live" "recorded", "dvr"
                scaleMode: this._scalingMap[this.pp.getConfig('videoScaling')],
                enableStageVideo: this._hardwareAcceleration,
                disableHardwareAcceleration: !this._hardwareAcceleration,
                javascriptCallbackFunction: 'window.projekktorOSMFReady' + ppId
            }, this.pp.getConfig('OSMFVars'))
        };
    
        this.createFlash(domOptions, destContainer);
    },
    
    flashReadyListener: function() {},

    // disable default addListener & removeListeners methods
    addListeners: function() {},
    removeListeners: function() {},
    
    loadProgressUpdate: function () {},
        
    applySrc: function() {
        var ref = this,
            sources = this.getSource();
        
        try {
            this.mediaElement[0].setMediaResourceURL(sources[0].src);
        }
        catch(e){}
        
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
                    $.each(this._eventMap, function(key, value){
                        ref.mediaElement[0].addEventListener(key, "projekktor('"+ref.pp.getId()+"').playerModel." + value);
                    });
                    
                    this.applySrc();
                    this.displayReady();
                    
                }
            break;
            
            // ther is no public event-hook for this:
            case 'loadedmetadata':
                this.metaDataListener(value);
                break;
                
            case 'progress':
                this.progressListener({
                    loaded: value.buffered._end,
                    total: this.media.duration
                });
            break;
            
            // other possible events
            case "emptied":
            case "loadstart":
            case "play":
            case "pause":
            case "waiting": // buffering
            case "loadedmetadata":
            case "seeking":
            case "seeked":
            case "volumechange":
            case "durationchange":
            case "timeupdate":
            case "complete":

            default:
            // console.log(event, obj);
            break;
        }           
    },
    
    OSMF_universal: function() {},
    
    OSMF_isRecordingChange: function() {},
    
    OSMF_PlayerCapabilityChange: function(state) {},
 
    OSMF_bytesLoadedChange: function() {
        var me = this.mediaElement[0],
            progress = 0;
            
        progress = me.getBytesLoaded() * 100 / me.getBytesTotal();

        if (this.media.loadProgress > progress) return;

        this.media.loadProgress = (this.allowRandomSeek === true) ? 100 : -1;
        this.media.loadProgress = (this.media.loadProgress < 100 || this.media.loadProgress === undefined) ? progress : 100;

        this.sendUpdate('progress', this.media.loadProgress);
    },
        
    OSMF_durationChange: function(value) {
        if (isNaN(value)) return;
        this.timeListener({position: this.media.position, duration: value || 0 });
        this.seekedListener();
    },
    
    OSMF_currentTimeChange: function(value) {
        if (this._isDVR) {
            this.sendUpdate('isLive', (value+20 >= this.media.duration)); // 20 => default dvr buffer of SMP
        }
        this.timeListener({position: value, duration: this.media.duration || 0 });
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
                // causes false positive in case of dynamically loaded plugins
                // this.errorListener(80);
            break;            
        }
    },
    
    /* catching playStateChange and playerStateChange and playerStateChange aaaand... and playerStateChange */
    OSMF_playerStateChange: function(state) {
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
        this._quality = this._quality === 'default' ? 'auto' : this._quality;
        this._isDynamicStream = value;
    },
    
    OSMF_autoSwitchChange: function() {
         this.getDynamicStreamingStatus('OSMF_autoSwitchChange');
         if(this._requestedDynamicStreamIndex < 0){
            this.clearBuffer();
         }
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
            qualityKeys = [];
    
        this.availableQualities = {};

        for (var i=0; i < numStreams; i++){
            if (dynamicStreams[i].bitrate !== undefined) {
                // audio/video stream quality
                if(dynamicStreams[i].height > 0){
                    isAudioOnly = false;
                    keyName = $p.utils.parseTemplate(avKeyFormat , {
                                    height: dynamicStreams[i].height,
                                    width: dynamicStreams[i].width,
                                    bitrate: Math.floor(dynamicStreams[i].bitrate)
                            });
                }
                // audio-only stream quality
                else {
                    isAudioOnly = true;
                    if(showAudioOnly){
                        keyName = $p.utils.parseTemplate(aoKeyFormat , {
                                        bitrate: Math.floor(dynamicStreams[i].bitrate)
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
    
    canSeekTo: function(val) {
        return this.mediaElement[0].canSeekTo(val);
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
                    name = index + ' dimentions: ' + streams[index].width + "x" + streams[index].height + " | bitrate: " + streams[index].bitrate + ' | streamName: ' + streams[index].streamName;
                    $p.utils.log('| ' + name);
                }
            }
            $p.utils.log('| ======================================');
        }
    },
    
    errorListener: function() {
        /* todo OSMF MediaErrorCodes mapping http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/org/osmf/events/MediaErrorCodes.html */
        switch (arguments[0]) {
            case 15:
                this.sendUpdate('error', 5);
                break;
            case 16:
                this.sendUpdate('error', 80);
                break;                    
            case 80:
            case 7:
                this.sendUpdate('error', 80);
                break;                
            default:
                // this.sendUpdate('error', 0);
                break;
        }
    },
    
    detachMedia: function() {        
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
    }    
    
    /************************************************
     * disablers
     ************************************************/    
    // _scaleVideo: function(){}
    
});

$p.newModel({    

    modelId: 'OSMFAUDIO',
    replace: 'AUDIOFLASH',
    
    hasGUI: false,
    iLove: [
        {ext:'mp3', type:'audio/mp3', platform:'flash', streamType: ['*']},
        {ext:'m4a', type:'audio/mp4', platform:'flash', streamType: ['*']},
        {ext:'m4a', type:'audio/mpeg', platform:'flash', streamType: ['*']}    
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
        
        var domOptions = {
            id: ppMediaId + "_flash",
            name: ppMediaId + "_flash",
            src: this.pp.getConfig('playerFlashMP4'),
            width: '100%',
            height: '100%',
            style: "position: absolute;",
            allowScriptAccess: "always",
            quality: "high", 
            menu: false,
            allowFullScreen: 'true',
            wmode: ($p.utils.ieVersion() < 9) ? 'transparent' : 'opaque', // must be either transparent (ie) or opaque in order to allow HTML overlays
            SeamlessTabbing: 'false',
            bgcolor: '#000000',
            FlashVars: $.extend({
                javascriptCallbackFunction: 'window.projekktorOSMFReady' + ppId               
            }, this.pp.getConfig('OSMFVars'))
        };
        this.createFlash(domOptions, flashContainer, false); 
        
    }
    
}, 'OSMFVIDEO');
});