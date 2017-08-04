/*
 * Copyright 2016-2017 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 *
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 *
 * This model is interfacing video.js library
 *
 * video.js
 * Website: http://videojs.com/
 * License: Apache 2.0 License
 *
 */

(function(window, document, $, $p){

    $p.newModel({
        modelId: 'VIDEOJS',
        videojsVersion: '1',

        iLove: [{
            ext: 'mp4',
            type: 'video/mp4',
            platform: ['videojs']
        }],

        _videojs: null,

        _eventMap: {
            pause: "vjsPauseListener",
            play: "vjsPlayingListener",
            volumechange: "vjsVolumeListener",
            progress: "vjsProgressListener",
            timeupdate: "vjsTimeListener",
            ended: "vjsEndedListener",
            waiting: "vjsWaitingListener",
            canplaythrough: "vjsCanplayListener",
            canplay: "vjsCanplayListener",
            error: "vjsErrorListener",
            emptied: "vjsEmptiedListener",
            stalled: "vjsStalledListener",
            seeked: "vjsSeekedListener",
            loadedmetadata: "vjsResizeListener",
            loadeddata: "vjsResizeListener",
            resize: "vjsResizeListener"
        },

        applyMedia: function (destContainer) {
            var ref = this,
                videoJsLoadSuccess = function () {
                    if ($('#' + ref.getMediaElementId()).length === 0) {

                        ref.wasPersistent = false;

                        destContainer.html('').append(
                            $('<video/>')
                            .attr({
                                "id": ref.getMediaElementId(),
                                "poster": $p.utils.imageDummy(),
                                "src": ref.getSource()[0].src,
                                "loop": false,
                                "autoplay": false,
                                "preload": "none",
                                "x-webkit-airplay": "allow",
                                "playsinline": ""
                            }).prop({
                                controls: false,
                                volume: ref.getVolume()
                            }).css({
                                'width': '100%',
                                'height': '100%',
                                'position': 'absolute',
                                'top': 0,
                                'left': 0
                            })
                        );
                    }

                    ref.mediaElement = $('#' + ref.getMediaElementId());
                    ref.initVideoJs();
                },
                videoJsLoadFailed = function (jqxhr, settings, exception) {
                    ref.sendUpdate('error', 2);
                };

            // check if videojs.js is already loaded
            if (window.videojs && typeof window.videojs === 'function') {
                // just continue
                videoJsLoadSuccess();
            } else {
                // load video.js CSS
                $p.utils.getCss(ref.pp.getConfig('platformsConfig').videojs.css);
                // load video.js JS
                $p.utils.getScript(ref.pp.getConfig('platformsConfig').videojs.src, {
                        cache: true
                    })
                    .done(videoJsLoadSuccess)
                    .fail(videoJsLoadFailed);
            }
        },

        initVideoJs: function () {
            var ref = this,
                wasAwakening = ref.getState('AWAKENING'),
                vjsConfig = ref.pp.getConfig('platformsConfig').videojs.initVars;

            ref._videojs = window.videojs(ref.mediaElement[0], vjsConfig, function (event, data) {
                // on video.js ready
                ref.mediaElement = $(this.contentEl());

                ref.addVideoJsEventListeners();
                if (wasAwakening) {
                    ref.displayReady();
                    return;
                }

                if (ref.getSeekState('SEEKING')) {
                    if (ref._isPlaying) {
                        ref.setPlay();
                    }

                    ref.seekedListener();
                    return;
                }

                if (ref._isPlaying) {
                    ref.setPlay();
                }
            });
        },

        detachMedia: function () {
            try {
                this._videojs.dispose();
            } catch (e) {}
        },

        /*****************************************
         * Handle Events
         ****************************************/
        addVideoJsEventListeners: function () {
            var ref = this;
            // add model reference to current videojs instance for later usage within event handlers
            // NOTE: all event listeners in video.js are binded to the video.js instance (this === _videojs)
            ref._videojs._ppModel = ref;

            // add event listeners
            $.each(this._eventMap, function (key, value) {
                var listener = ref[value];
                ref._videojs.on(key, listener);
            });
        },

        removeVideoJsEventListeners: function () {
            var ref = this;

            // remove event listeners
            $.each(this._eventMap, function (key, value) {
                var listener = ref[value];
                ref._videojs.off(key, listener);
            });
        },

        vjsPlayingListener: function (evt) {
            var ref = this._ppModel;
            ref.playingListener();
        },

        vjsPauseListener: function (evt) {
            var ref = this._ppModel;
            ref.pauseListener();
        },
        vjsVolumeListener: function (evt) {
            var ref = this._ppModel;
            ref.volumeListener(this.volume());
        },

        vjsProgressListener: function (evt) {
            var ref = this._ppModel;
            ref.progressListener(evt);
        },
        vjsSeekedListener: function (evt) {
            var ref = this._ppModel;
            ref.seekedListener(this.currentTime());
        },

        vjsTimeListener: function (evt) {
            var ref = this._ppModel,
                time = {
                    position: this.currentTime(),
                    duration: this.duration()
                };
            ref.timeListener(time);
        },

        vjsEndedListener: function (evt) {
            var ref = this._ppModel || this;
            ref.removeVideoJsEventListeners();
            ref.endedListener(evt);
        },

        vjsResizeListener: function (evt) {
            var ref = this._ppModel,
                size = {
                    videoWidth: this.videoWidth(),
                    videoHeight: this.videoHeight()
                };

            ref.resizeListener(size);
        },

        vjsWaitingListener: function (evt) {
            var ref = this._ppModel;
            ref.waitingListener(evt);
        },

        vjsCanplayListener: function (evt) {
            var ref = this._ppModel;
            ref.canplayListener(evt);
        },

        vjsEmptiedListener: function (evt) {
            var ref = this._ppModel;
            ref._setBufferState('EMPTY');
        },

        vjsStalledListener: function (evt) {
            var ref = this._ppModel;
            ref._setBufferState('EMPTY');
        },

        vjsErrorListener: function (evt, vjsRef) {
            var ref = this._ppModel || this,
                vjsPlayer = vjsRef || this,
                error = vjsPlayer.error() || evt.error;
            try {
                switch (error.code) {
                    case error.MEDIA_ERR_ABORTED:
                        ref.sendUpdate('error', 1);
                        break;
                    case error.MEDIA_ERR_NETWORK:
                        ref.sendUpdate('error', 2);
                        break;
                    case error.MEDIA_ERR_DECODE:
                        ref.sendUpdate('error', 3);
                        break;
                    case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        ref.sendUpdate('error', 4);
                        break;
                    default:
                        ref.sendUpdate('error', 5);
                        break;
                }
            } catch (e) {
                console.log(e);
            }
        },

        /*****************************************
         * Setters
         ****************************************/
        setPlay: function () {
            try {
                this._videojs.play();
            } catch (e) {}
        },

        setPause: function () {
            try {
                this._videojs.pause();
            } catch (e) {}
        },

        setVolume: function (volume) {
            if (this.mediaElement === null) {
                this.volumeListener(volume);
            } else {
                this._videojs.volume(volume);
            }
        },

        setSeek: function (newpos) {
            var ref = this,
                np = newpos;

            (function () {
                try {
                    ref._videojs.currentTime(np);
                    ref.timeListener({
                        position: np
                    });
                } catch (e) {
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

            return this._videojs.volume();
        }
    });
    
}(window, document, jQuery, projekktor));