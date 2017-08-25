/*
 * this file is part of:
 * projekktor player
 * http://www.projekktor.com
 *
 * Copyright 2016-2017 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 * 
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 *
 * This model is interfacing hls.js library
 *
 * hls.js
 * Website: https://github.com/video-dev/hls.js
 * License: Apache 2.0 License
 *
 */

(function(window, document, $, $p){

    "use strict";

    $p.newModel({

        modelId: 'MSEVIDEOHLS',
        mseVersion: '1.0',

        iLove: [{
            ext: 'm3u8',
            type: 'application/x-mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u8',
            type: 'application/vnd.apple.mpegurl',
            platform: ['mse']
        }],

        _hlsjs: null,

        availableQualities: {},

        _qualitySwitching: false,
        _isDynamicStream: false,
        _requestedDynamicStreamIndex: -1, // inited with "auto switch" value to indicate that no index was manually requested
        _bufferTime: 0,
        _liveOffset: 2,

        applyMedia: function (destContainer) {
            var ref = this,
                hlsJsLoadSuccess = function () {
                    if ($('#' + ref.pp.getMediaId() + "_html").length === 0) {

                        ref.wasPersistent = false;

                        destContainer.html('').append(
                            $('<video/>')
                            .attr({
                                "id": ref.pp.getMediaId() + "_html",
                                "poster": $p.utils.imageDummy(),
                                "loop": false,
                                "autoplay": false,
                                "preload": "auto",
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

                    ref.mediaElement = $('#' + ref.pp.getMediaId() + "_html");
                    ref.addListeners();
                    ref.applySrc();
                },
                hlsJsLoadFailed = function (jqxhr, settings, exception) {
                    ref.sendUpdate('error', 2);
                };

            // check if hls.js is already loaded
            if (window.Hls && typeof window.Hls.isSupported === 'function') {
                // just continue
                hlsJsLoadSuccess();
            } else {
                // load hls.js
                $p.utils.getScript(ref.pp.getConfig('platformsConfig').mse.hlsjs.src, {
                        cache: true
                    })
                    .done(hlsJsLoadSuccess)
                    .fail(hlsJsLoadFailed);
            }
        },

        applySrc: function () {
            var ref = this,
                media = ref.getSource(),
                wasAwakening = ref.getState('AWAKENING'),
                hlsConfig = ref.pp.getConfig('platformsConfig').mse.hlsjs.initVars;

            ref._hlsjs = new Hls(hlsConfig);

            ref._hlsjs.loadSource(media[0].src);
            ref._hlsjs.attachMedia(ref.mediaElement[0]);
            // add hlsjs event listeners
            ref._hlsjs.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                ref.updateAvailableDynamicStreamsQualities(data);
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
            ref._hlsjs.on(Hls.Events.LEVEL_SWITCH, function (event, data) {
                ref.qualityChangeListener();
            });

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
            this.mediaElement.on('mousedown.projekktorqs' + this.pp.getId(), this.disableDefaultVideoElementActions);
            this.mediaElement.on('click.projekktorqs' + this.pp.getId(), this.disableDefaultVideoElementActions);
        },

        detachMedia: function () {
            try {
                this._hlsjs.detachMedia();
                this._hlsjs.destroy();
                this.mediaElement.off('.projekktorqs' + this.pp.getId());
            } catch (e) {}
        },

        /**
         * Update projekktor internal quality keys for currently active playlist item
         * with hls.js dynamic stream item values
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
        updateAvailableDynamicStreamsQualities: function (data) {

            var dynamicStreams = data.levels,
                numStreams = dynamicStreams.length,
                keyName = '',
                isAudioOnly = false,
                showAudioOnly = this.pp.getConfig('dynamicStreamShowAudioOnlyQualities'),
                avKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioVideo'),
                aoKeyFormat = this.pp.getConfig('dynamicStreamQualityKeyFormatAudioOnly'),
                dpc = this.pp.getConfig('dynamicStreamQualityKeyBitrateRoundingDecimalPlacesCount'),
                bitrate = 0,
                bitrateKbps = 0,
                bitrateMbps = 0,
                bitrateUnit = 'kbps',
                qualityKeys = [];

            this.availableQualities = {};

            for (var i = 0; i < numStreams; i++) {
                if (dynamicStreams[i].bitrate !== undefined) {

                    bitrateKbps = Math.floor(dynamicStreams[i].bitrate / 1000);
                    bitrateMbps = $p.utils.roundNumber(bitrateKbps / 1000, dpc);
                    bitrate = bitrateKbps < 1000 ? bitrateKbps : bitrateMbps;
                    bitrateUnit = bitrateKbps < 1000 ? 'kbps' : 'Mbps';

                    // audio/video stream quality
                    if (dynamicStreams[i].height > 0) {
                        isAudioOnly = false;
                        keyName = $p.utils.parseTemplate(avKeyFormat, {
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
                        if (showAudioOnly) {
                            keyName = $p.utils.parseTemplate(aoKeyFormat, {
                                bitrate: bitrate,
                                bitrateunit: bitrateUnit,
                                bitratekbps: bitrateKbps,
                                bitratembps: bitrateMbps
                            });
                        }
                    }

                    if (keyName.length && (isAudioOnly === showAudioOnly)) {
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
        switchDynamicStreamIndex: function (index) {
            // return if the index is NaN or is the current index or is out of range
            if ((isNaN(index) ||
                    (index < 0 && this.getAutoDynamicStreamSwitch()) ||
                    (index === this.getCurrentDynamicStreamIndex() && !this.getAutoDynamicStreamSwitch()) ||
                    index > this.getMaxAllowedDynamicStreamIndex())) {
                return false;
            }

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

                // if there is atempt to manual switch but after disabling auto switching
                // current index is already the requested one (without that check the player tend to hang)
                if (index !== this.getCurrentDynamicStreamIndex()) {
                    this._hlsjs.currentLevel = index;
                }
            }

            this.getDynamicStreamingStatus('after switchDynamicStreamIndexTo');

            return index;
        },

        getStreamItems: function () {
            return this._hlsjs.levels
        },

        getNumDynamicStreams: function () {
            return this._hlsjs.levels.length;
        },

        /**
         * The maximum allowed index. This can be set at run-time to
         * provide a ceiling for the switching profile, for example,
         * to keep from switching up to a higher quality stream when
         * the current video is too small to handle a higher quality stream.
         *
         * The default is the highest stream index.
         */
        getMaxAllowedDynamicStreamIndex: function () {
            if (this.getAutoDynamicStreamSwitch() && this._hlsjs.autoLevelCapping >= 0) {
                return this._hlsjs.autoLevelCapping;
            } else {
                return this.getNumDynamicStreams() - 1;
            }
        },

        setMaxAllowedDynamicStreamIndex: function (val) {
            if (!isNaN(val) && val !== this.getMaxAllowedDynamicStreamIndex() && val >= 0 && val < this.getNumDynamicStreams()) {
                this._hlsjs.autoLevelCapping = val;
            } else if (val < 0) {
                this._hlsjs.autoLevelCapping = -1;
            }
        },

        /**
         * The index of the current dynamic stream. Uses a zero-based index.
         */
        getCurrentDynamicStreamIndex: function () {
            return this._hlsjs.currentLevel;
        },

        /**
         * Defines whether or not the model should be in manual
         * or auto-switch mode. If in manual mode the switchDynamicStreamIndex
         * method can be used to manually switch to a specific stream index.
         */
        getAutoDynamicStreamSwitch: function () {
            return this._hlsjs.autoLevelEnabled;
        },

        setAutoDynamicStreamSwitch: function (val) {
            if (val === true) { // enable auto stream switching
                this._hlsjs.currentLevel = -1;
                this._hlsjs.nextLevel = -1;
                this._hlsjs.loadLevel = -1;
            }
        },

        getDynamicStreamingStatus: function (name) {
            if ($p.utils.logging) {
                $p.utils.log('| ' + name + ' | getDynamicStreamingStatus ===');
                $p.utils.log(
                    '| reqIdx: ', this._requestedDynamicStreamIndex,
                    ', current index: ', this.getCurrentDynamicStreamIndex(),
                    ', max allowed index: ', this.getMaxAllowedDynamicStreamIndex(),
                    ', num streams: ', this.getNumDynamicStreams(),
                    ', auto:', this.getAutoDynamicStreamSwitch()
                );
                var streams = this.getStreamItems();
                for (var index in streams) {
                    if (streams.hasOwnProperty(index) && streams[index].bitrate !== undefined) {
                        name = index + ' dimensions: ' + streams[index].width + "x" + streams[index].height + " | bitrate: " + streams[index].bitrate + ' | streamName: ' + streams[index].streamName;
                        $p.utils.log('| ' + name);
                    }
                }
                $p.utils.log('| ======================================');
            }
        },

        setQuality: function (quality) {
            if (this._quality == quality) {
                return;
            }
            this._quality = quality;

            // dynamic streams
            if (this._isDynamicStream === true) {
                this.switchDynamicStreamIndex((quality == 'auto') ? -1 : this.availableQualities[quality]);
            }
        },

    }, 'VIDEO');

    $p.newModel({

        modelId: 'MSEAUDIOHLS',

        mseVersion: '1.0',
        platform: 'mse',

        iLove: [{
            ext: 'm3u8',
            type: 'application/vnd.apple.mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u',
            type: 'application/vnd.apple.mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u8',
            type: 'application/x-mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u',
            type: 'application/x-mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u8',
            type: 'audio/mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u',
            type: 'audio/mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u8',
            type: 'audio/x-mpegurl',
            platform: ['mse']
        }, {
            ext: 'm3u',
            type: 'audio/x-mpegurl',
            platform: ['mse']
        }],
        applyMedia: function (destContainer) {
            var ref = this,
                hlsJsLoadSuccess = function () {

                    $p.utils.blockSelection(destContainer);

                    if ($('#' + ref.pp.getMediaId() + "_html").length === 0) {
                        ref.wasPersistent = false;

                        destContainer.html('').append(
                            $('<audio/>')
                            .attr({
                                "id": ref.pp.getMediaId() + "_html",
                                "poster": $p.utils.imageDummy(),
                                "loop": false,
                                "autoplay": false,
                                "preload": "auto",
                                "x-webkit-airplay": "allow",
                                "playsinline": ""
                            }).prop({
                                controls: false,
                                volume: ref.getVolume()
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
                    ref.imageElement = ref.applyImage(ref.getPoster('cover') || ref.getPoster('poster'), destContainer);
                    ref.imageElement.css({
                        border: '0px'
                    });
                    ref.mediaElement = $('#' + ref.pp.getMediaId() + "_html");
                    ref.addListeners();
                    ref.applySrc();
                },
                hlsJsLoadFailed = function (jqxhr, settings, exception) {
                    ref.sendUpdate('error', 2);
                };

            // check if hls.js is already loaded
            if (window.Hls && typeof window.Hls.isSupported === 'function') {
                // just continue
                hlsJsLoadSuccess();
            } else {
                // load hls.js
                $p.utils.getScript(ref.pp.getConfig('platformsConfig').mse.src, {
                        cache: true
                    })
                    .done(hlsJsLoadSuccess)
                    .fail(hlsJsLoadFailed);
            }
        }
    }, 'MSEVIDEOHLS');
    
}(window, document, jQuery, projekktor));