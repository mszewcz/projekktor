/*
 * this file is part of:
 * projekktor player
 * http://www.projekktor.com
 *
 * Copyright 2014-2015 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 *
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 *
 * This model is interfacing mediaplayer.js Silverlight fallback player
 *
 * MediaElement.js
 * Author: John Dyer http://j.hn/
 * Website: http://mediaelementjs.com/
 * License: MIT
 *
 */

(function(window, document, $, $p){

    "use strict";

$p.newModel({

    modelId: 'SILVERLIGHTVIDEO',

    silverlightVersion: '3.0',

    iLove: [
        {ext:'wmv', type:'video/wmv', platform: ['silverlight']},
        {ext:'wmv', type:'video/x-ms-wmv', platform: ['silverlight']},
        {ext:'mp4', type:'video/mp4', platform: ['silverlight']},
        {ext:'mp4', type:'video/m4v', platform: ['silverlight']},
        {ext:'mov', type:'video/mov', platform: ['silverlight']},
        {ext:'mov', type:'video/quicktime', platform: ['silverlight']},
        {ext:'m4v', type:'video/mp4', platform: ['silverlight']}
    ],

    allowRandomSeek: false,
    _bufferTime: 6, // default 6 seconds
    _modelInitTimeout: 120000,
    _modelInitTimeoutId: null,
    _silverlightApi: {},

    _eventMap: {
        paused:         "pauseListener",
        play:           "playingListener",
        volumechange:   "volumeListener",
        progress:       "_progress",
        timeupdate:     "timeListener",
        ended:          "endedListener",
        canplay:        "canplayListener",
        'System.Windows.MediaFailedRoutedEventArgs': "errorListener",
        seeked:         "seekedListener",
        loadedmetadata: "resizeListener",
        loadstart: "loadstartListener",

        // events to ignore
        playing: "nullListener",
        loadeddata: "nullListener",
        seeking: "nullListener",
        click: "nullListener"
    },

    applyMedia: function(destContainer) {
        var ref = this,
            ppId = ref.pp.getId(),
            ppMediaId = ref.pp.getMediaId();

        // register global listener
        window['projekktorSilverlightReady' + ppId] = function(id) {
            projekktor(ppId).playerModel.silverlightReadyListener(id);
        };

        window['projekktorSilverlightEventListener' + ppId] = function(id, eventName, values)  {
            projekktor(ppId).playerModel.silverlightEventListener(id, eventName, values);
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
            src: this.pp.getConfig('platformsConfig').silverlight.src,
            attributes: {
                id: ppMediaId + "_silverlight",
                name: ppMediaId + "_silverlight",
                width: '100%',
                height: '100%',
                style: "position: absolute;"
            },
            parameters: {
                windowless: true,
                background: "black",
                minRuntimeVersion: "3.0.0.0",
                autoUpgrade: true,
                enableGPUAcceleration: true
            },
            initVars: $.extend({
                id: ppId,
                isvideo: true,
                autoplay: false,
                preload: "none",
                startvolume: this.getVolume(),
                timerrate: 250,
                jsinitfunction: 'window.projekktorSilverlightReady' + ppId,
                jscallbackfunction: 'window.projekktorSilverlightEventListener' + ppId
            }, this.pp.getConfig('platformsConfig').silverlight.initVars || {})
        };

        this.mediaElement = $p.utils.embedPlugin('silverlight', destContainer, config, true);
        this._modelInitTimeoutId = setTimeout(function(){
            ref._modelInitTimeoutHandler();
        }, this._modelInitTimeout);
    },

    applySrc: function() {
        var ref = this,
            sources = this.getSource();

        try {
            this._silverlightApi.setSrc(sources[0].src);
        }
        catch(e){}

        if (this.getState('PLAYING')) {
            this.setPlay();
            if (this.media.position>0) {
                this.setSeek(this.media.position);
            }
        }

        return true;
    },

    detachMedia: function() {
        var ppId = this.pp.getId();
        // delete global listeners functions
        delete window['projekktorSilverlightReady' + ppId];
        delete window['projekktorSilverlightEventListener' + ppId];

        try {
            this.mediaElement[0].remove();
        }
        catch(e){}
    },

    /*****************************************
     * Handle Events
     ****************************************/

    addListeners: function() {},

    removeListeners: function() {},

    _modelInitTimeoutHandler: function(){
        this.sendUpdate('error', 200, "Model " + this.modelId + " init timeout");
    },

    silverlightReadyListener: function(mediaId) {
        clearTimeout(this._modelInitTimeoutId);

        if(!this.mediaElement){
            this.mediaElement = $('#' +  mediaId); // IE 10 sucks
        }

        if (this.mediaElement !== null && (this.getState('AWAKENING') || this.getState('STARTING'))) {
            this._silverlightApi = this.mediaElement[0].Content.MediaElementJS;
            this.applySrc();
            this.displayReady();
        }
    },

    silverlightEventListener: function(id, eventName, values) {
        try {
            this[this._eventMap[eventName]](values);
        }
        catch(e){
            console.log(e, eventName);
        }
    },

    loadstartListener: function(event) {
        this._setBufferState('EMPTY');
    },

    errorListener: function() {
        this.sendUpdate('error', 4);
    },

    _progress: function(event) {
        // handle buffering
        /* there is a bug in the msjs Silverlight element that prevents bufferedBytes from update from 0 to 1
         * with good quality network connection. So we need to check the change of bufferedTime to overcome this problem.
         */
        if(event.bufferedBytes === 1 || this._bufferTime <= event.bufferedTime - event.currentTime){
                this._setBufferState('FULL');
        }
        else {
            this._setBufferState('EMPTY');
        }

        this.progressListener({loaded:event.bufferedTime, total:event.duration});
    },

    /************************************************
     * setters
     ************************************************/

    setSeek: function(newpos) {
        this._silverlightApi.setCurrentTime(newpos);
    },

    setVolume: function(volume) {
        if (this.mediaElement === null) {
            this.volumeListener(volume);
        }
        else {
            this._silverlightApi.setVolume(volume);
        }
    },

    setPause: function() {
        this._silverlightApi.pauseMedia();
    },

    setPlay: function() {
        this._silverlightApi.playMedia();
    },

    setQuality: function (quality) {
        if (this._quality === quality) {
            return;
        }

        this._quality = quality;

        this._qualitySwitching = true;
        this.applySrc();
        this._qualitySwitching = false;
        this.qualityChangeListener();
    }
});

$p.newModel({

    modelId: 'SILVERLIGHTAUDIO',

    hasGUI: false,
    iLove: [
        {ext:'mp3', type:'audio/mp3', platform: ['silverlight']},
        {ext:'m4a', type:'audio/mp4', platform: ['silverlight']},
        {ext:'m4a', type:'audio/mpeg', platform: ['silverlight']},
        {ext:'wma', type:'audio/wma', platform: ['silverlight']},
        {ext:'wma', type:'audio/x-ms-wma', platform: ['silverlight']},
        {ext:'wav', type:'audio/wav', platform: ['silverlight']}
    ],
    applyMedia: function(destContainer) {
        var ref = this,
            ppId = ref.pp.getId(),
            ppMediaId = ref.pp.getMediaId();

        $p.utils.blockSelection(destContainer);

        // create image element
        this.imageElement = this.applyImage(this.getPoster('cover') || this.getPoster('poster'), destContainer);

        // register global listener
        window['projekktorSilverlightReady' + ppId] = function(id) {
            projekktor(ppId).playerModel.silverlightReadyListener(id);
        };

        window['projekktorSilverlightEventListener' + ppId] = function(id, eventName, values)  {
            projekktor(ppId).playerModel.silverlightEventListener(id, eventName, values);
        };

        var config = {
            src: this.pp.getConfig('platformsConfig').silverlight.src,
            attributes: {
                id: ppMediaId + "_silverlight",
                name: ppMediaId + "_silverlight",
                width: '100%',
                height: '100%',
                style: "position: absolute;"
            },
            parameters: {
                windowless: true,
                background: "black",
                minRuntimeVersion: "3.0.0.0",
                autoUpgrade: true
            },
            initVars: $.extend({
                id: ppId,
                isvideo: true,
                autoplay: false,
                preload: "none",
                startvolume: this.getVolume(),
                timerrate: 250,
                jsinitfunction: 'window.projekktorSilverlightReady' + ppId,
                jscallbackfunction: 'window.projekktorSilverlightEventListener' + ppId
            }, this.pp.getConfig('platformsConfig').silverlight.initVars || {})
        };

        this.mediaElement = $p.utils.embedPlugin('silverlight', destContainer, config, true);
        this._modelInitTimeoutId = setTimeout(function(){
            ref._modelInitTimeoutHandler();
        }, this._modelInitTimeout);
    }

}, 'SILVERLIGHTVIDEO');

}(window, document, jQuery, projekktor));