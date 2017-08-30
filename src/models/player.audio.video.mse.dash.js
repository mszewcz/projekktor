(function (window, document, $, $p) {

    "use strict";

    $p.newModel({
        modelId: 'MSEVIDEODASH',
        mseVersion: '1.0',

        iLove: [{
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

        _dashjs: null,
        _video: null,
        _quality: null,
        _qualityMap: null,
        _showAudioOnly: null,

        mediaElement: null,

        applyMedia: function (destContainer) {
            var ref = this;

            this._showAudioOnly = this.pp.getConfig('dynamicStreamShowAudioOnlyQualities');

            this._fetchDashJs(function (dashjsLib) {
                $p.utils.log('dashjs lib successfully loaded');

                ref._initMedia(destContainer);
            });
        },

        /**
         *  `_initMedia` setting up DashJS.
         * 
         * @param {object} destContainer
         *        container element for <video>
         */
        _initMedia: function (destContainer) {
            var ref = this,
                dashjsConfig = ref.pp.getConfig('platformsConfig').mse.dashjs.initVars,
                wasAwakening = ref.getState('AWAKENING');

            ///// Stage 1:
            // Create dash.js MediaPlayer instance.
            this._dashjs = window.dashjs.MediaPlayer().create();

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
            var events = window.dashjs.MediaPlayer.events;

            this._dashjs.on(events["STREAM_INITIALIZED"], function (data) {

                // after "STREAM_INITIALIZED" it should be safe to set config values
                ref._setDashJsConfig(dashjsConfig);

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

            this._dashjs.on("public_keyError", function (error) {
                ref.sendUpdate('error', 302, error);
            });

            this._dashjs.on("public_keySessionClosed", function (event) {
                if (event.error !== undefined) {
                    ref.sendUpdate('error', 302, event.error);
                }
            });
            this._dashjs.on("public_licenseRequestComplete", function (event) {
                if (event.error !== undefined) {
                    ref.sendUpdate('error', 302, event.error);
                }
            });

            // set config set only 'debug' value here
            this._setDashJsConfig({
                debug: dashjsConfig.debug ? true : false
            });

            this.applySrc();
        },

        _setDashJsConfig: function(dashjsConfig){

            var ref = this;

            Object.keys(dashjsConfig).forEach(function (configKey) {

                var configVal = dashjsConfig[configKey];

                // not all of the methods are available in every phase of dashjs instance
                // life cycle so we need to catch that 
                try {
                    switch (configKey) {
                        case 'debug':
                            ref._dashjs.getDebug().setLogToBrowserConsole(configVal);
                            break;
                        case 'fastSwitchEnabled':
                            ref._dashjs.setFastSwitchEnabled(configVal);
                            break;
                        case 'limitBitrateByPortal':
                            ref._dashjs.setLimitBitrateByPortal(configVal);
                            break;
                        case 'usePixelRatioInLimitBitrateByPortal':
                            ref._dashjs.setUsePixelRatioInLimitBitrateByPortal(configVal);
                            break;
                        case 'enableBufferOccupancyABR':
                            ref._dashjs.enableBufferOccupancyABR(configVal);
                            break;
                    }
                } catch (error) {
                    $p.utils.log("DASHJS config setting failed on: ", configKey, configVal, error);
                }
            });
        },

        detachMedia: function () {

            if (this.mediaElement) {
                this.mediaElement = null;
            }

            if (this._dashjs) {
                if (this._dashjs.isReady()) {
                    this._dashjs.reset();
                }
                this._dashjs = null;
            }

            this._video = null;

            this._qualityMap = null;
            this._quality = null;
        },

        applySrc: function () {

            var file = this.getSource()[0],
                fileDrmConfig = Array.isArray(file.drm) ? file.drm : [],
                drmConfig = this.pp.getConfig('drm') || {}, // item or global
                availableDrmConfig = $p.utils.intersect(fileDrmConfig, Object.keys(drmConfig)),
                dashjsProtectionDataConf;

            if (fileDrmConfig.length > 0) {
                if (availableDrmConfig.length > 0) {
                    // DRM config required and available
                    dashjsProtectionDataConf = {};
                } else {
                    // DRM system required but no valid license server config defined
                    this.sendUpdate('error', 301);
                    return;
                }
            }

            availableDrmConfig.forEach(function (drm) {
                var dpc = dashjsProtectionDataConf;

                switch (drm) {
                    case 'widevine':
                        dpc["com.widevine.alpha"] = {
                            serverURL: drmConfig[drm]
                        };
                        break;
                    case 'playready':
                        dpc["com.microsoft.playready"] = {
                            serverURL: drmConfig[drm]
                        };
                        break;
                }
            });

            if (dashjsProtectionDataConf !== undefined) {
                this._dashjs.setProtectionData(dashjsProtectionDataConf);
            }

            // Initialize dash.js MediaPlayer
            this._dashjs.initialize(this._video, file.src, false);
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
            } else {
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
                keyName = null;


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