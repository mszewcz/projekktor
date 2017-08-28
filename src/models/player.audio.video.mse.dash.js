(function(window, document, $, $p){

    "use strict";

    $p.newModel({
        modelId: 'MSEVIDEODASH',
        mseVersion: '1.0',
        
        iLove: [
            {
                ext: 'ism',
                type: 'application/dash+xml',
                platform: ['mse'],
                drm: ['widevine', 'playready']
            },
            {
                ext: 'mpd',
                type: 'application/dash+xml',
                platform: ['mse'],
                drm: ['widevine', 'playready']
            }
        ],

        DASHJS: null,
        _dashjs: null,
        _hasInit: false,
        _file: null,
        _video: null,
        _quality: null,
        _qualityMap: null,
        _showAudioOnly: null,

        mediaElement: null,

        applyMedia: function (destContainer) {
            var ref = this;

            this._showAudioOnly = this.pp.getConfig('dynamicStreamShowAudioOnlyQualities');

            if (!this._hasInit) {
                this._hasInit = true;

                this._fetchDashJs(function (dashjs_) {
                    ref.DASHJS = dashjs_;
                    ref._file = ref.getSource()[0];
                    ref._initMedia(destContainer);
                });
            } else {
                this._initMedia(destContainer);
            }
        },

        /**
         *  `_initMedia` setting up DashJS.
         * 
         * @param {object} destContainer
         *        container element for <video>
         */
        _initMedia: function (destContainer) {
            var ref = this,
                wasAwakening = ref.getState('AWAKENING');

            ///// Stage 1:
            // Create dash.js MediaPlayer instance.
            this._dashjs = this.DASHJS.MediaPlayer().create();

            ///// Stage 2:
            // If there is <video> element in the display container then use it,
            // otherwise create new one. 
            var videoID = this.pp.getMediaId() + "_html";
            this._video = document.getElementById(videoID);

            if (!this._video) {
                this._video = $('<video/>').attr({
                    "id": videoID,
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
                    'width': '100%',
                    'height': '100%',
                    'position': 'absolute',
                    'top': 0,
                    'left': 0
                })[0];

                destContainer.html('').append(this._video);
            }

            this.mediaElement = $(this._video);

            ///// Stage 3:
            // Attach event listeners `this._dashjs`.
            var events = this.DASHJS.MediaPlayer.events;

            this._dashjs.on(events["STREAM_INITIALIZED"], function (data) {
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

            this._dashjs.on(events["PLAYBACK_METADATA_LOADED"], function () {
                var qualityList = ref._getQualityList();

                if (ref._qualityMap === null) {
                    ref._qualityMap = {};
                }

                for (var i = 0; i < qualityList.length; i++) {
                    ref._qualityMap[qualityList[i]] = i;
                }

                ref.sendUpdate('availableQualitiesChange', qualityList);
            });

            this._dashjs.on(events["QUALITY_CHANGE_REQUESTED"], function () {
                ref.qualityChangeListener();
            });

            this._dashjs.on(events["ERROR"], function (error) {
                ref.sendUpdate('error', 4, error);
            });

            this._dashjs.on(events["PLAYBACK_ERROR"], function (error) {
                ref.sendUpdate('error', 5, error);
            });

            this.applySrc();
        },

        detachMedia: function () {

            if (!!this.mediaElement) {
                this.mediaElement = null;
            }

            if (!!this._dashjs) {
                this._dashjs.reset();
                this._dashjs = null;
            }

            if (!!this._video) {
                this._video.parentNode.removeChild(this._video);
                this._video = null;
            }

            this._qualityMap = null;
            this._quality = null;

        },

        applySrc: function () {

            var drmConfig = this.pp.getConfig('drm'),
                buffer = {}

            if (typeof this._file['drm'] === "object") {
                for (var i = 0; i < this._file['drm'].length; i++) {
                    var item = this._file['drm'][i];

                    if (typeof drmConfig[item] === "string") {
                        buffer[item] = drmConfig[item];
                    }
                }
            }

            this._dashjs.setProtectionData({
                "com.microsoft.playready": {
                    serverURL: buffer['playready'] || null
                },
                "com.widevine.alpha": {
                    serverURL: buffer['widevine'] || null
                }
            });

            // Initialize dash.js MediaPlayer
            this._dashjs.initialize(this._video, this._file['src'], false);
        },

        /**
         * `_fetchDashJs` return `window.dashjs` if it's available.
         * Otherwise load DashJS lib from URL.
         * 
         * @param {function|null} cb
         *        {function} Callback function called after successful load of DashJS lib
         *                   Usage: `cb(dashjs)`
         *                  `dashjs` - reference to the DashJS lib
         *        {null} Callback function not specified.
         */
        _fetchDashJs: function (cb) {
            var ref = this;

            if (typeof window.dashjs === "object") {
                cb(window.dashjs);
            }
            else {
                $p.utils.getScript(ref.pp.getConfig('platformsConfig').mse.dashjs.src, {
                    cache: true
                }).done(function () {
                    if (typeof window.dashjs === "object") {
                        cb(window.dashjs);
                    } else {
                        ref.sendUpdate('error', 2);
                    }
                }).fail(function () {
                    ref.sendUpdate('error', 2);
                });
            }
        },

        _getQualityList: function () {

            var avKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioVideo'),
                aoKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioOnly'),
                dpc = this.pp.getConfig('dynamicStreamQualityKeyBitrateRoundingDecimalPlacesCount'),
                bitrateKbps = 0,
                bitrateMbps = 0,
                bitrateUnit = 'kbps',
                bitrate = 0,
                audioList = null,
                videoList = null,
                buffer = [],
                keyName = null


            if (!!this._showAudioOnly) {
                // Audio:
                audioList = this._dashjs.getBitrateInfoListFor('audio');

                for (var i = 0; i < audioList.length; i++) {
                    var item = audioList[i];

                    bitrateKbps = Math.floor(item['bitrate'] / 1000);
                    bitrateMbps = $p.utils.roundNumber(bitrateKbps / 1000, dpc);
                    bitrate = bitrateKbps < 1000 ? bitrateKbps : bitrateMbps;
                    bitrateUnit = bitrateKbps < 1000 ? 'kbps' : 'Mbps';

                    keyName = $p.utils.parseTemplate(aoKeyFormat, {
                        bitrate: bitrate,
                        bitrateunit: bitrateUnit,
                        bitratekbps: bitrateKbps,
                        bitratembps: bitrateMbps
                    });

                    buffer.push("" + keyName);
                }
            } else {
                // Video:
                videoList = this._dashjs.getBitrateInfoListFor('video');

                for (var i = 0; i < videoList.length; i++) {
                    var item = videoList[i];

                    bitrateKbps = Math.floor(item['bitrate'] / 1000);
                    bitrateMbps = $p.utils.roundNumber(bitrateKbps / 1000, dpc);
                    bitrate = bitrateKbps < 1000 ? bitrateKbps : bitrateMbps;
                    bitrateUnit = bitrateKbps < 1000 ? 'kbps' : 'Mbps';

                    keyName = $p.utils.parseTemplate(avKeyFormat, {
                        height: item['height'],
                        width: item['width'],
                        bitrate: bitrate,
                        bitrateunit: bitrateUnit,
                        bitratekbps: bitrateKbps,
                        bitratembps: bitrateMbps
                    });

                    buffer.push("" + keyName);
                }
            }

            buffer.push('auto');
            return buffer;
        },

        /*****************************************
         * Setters
         ****************************************/

        setQuality: function (quality) {

            if (this._quality === quality) {
                return;
            }

            if (!!this._showAudioOnly) {
                if (quality === "auto") {
                    this._dashjs.setAutoSwitchQualityFor('audio', true);
                } else {
                    this._dashjs.setAutoSwitchQualityFor('audio', false);
                    this._dashjs.setQualityFor('audio', this._qualityMap[quality]);
                }
            } else {
                if (quality === "auto") {
                    this._dashjs.setAutoSwitchQualityFor('video', true);
                } else {
                    this._dashjs.setAutoSwitchQualityFor('video', false);
                    this._dashjs.setQualityFor('video', this._qualityMap[quality]);
                }
            }

            this._quality = quality;
        },

        /************************************************
         * Getters
         ************************************************/

        getQuality: function () {
            return this._quality;
        }

    }, 'VIDEO');
    
}(window, document, jQuery, projekktor));