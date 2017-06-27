jQuery(function ($) {
    $p.newModel({
        modelId: 'MSEVIDEODASH',

        iLove: [
            {
                ext: 'ism',
                type: 'application/dash+xml',
                platform: ['mse'],
                streamType: ['http', 'httpVideo', 'httpVideoLive']
            },
            {
                ext: 'mpd',
                type: 'application/dash+xml',
                platform: ['mse'],
                streamType: ['http', 'httpVideo', 'httpVideoLive']
            }
        ],

        DASHJS: null,
        _dashJs: null,
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
            var ref = this;

            ///// Stage 1:
            // Create dash.js MediaPlayer instance.
            this._dashjs = this.DASHJS.MediaPlayer().create();

            this.setQuality('auto');

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

            this._dashjs.on(events["PLAYBACK_TIME_UPDATED"], function (data) {

                ref.timeListener({
                    position: data['time'],
                    duration: (0.0 + data['time'] + data['timeToEnd'])
                });

            });

            this._dashjs.on(events["PLAYBACK_SEEKED"], function () {
                ref.seekedListener(ref._dashjs.time());
            });

            this._dashjs.on(events["PLAYBACK_PLAYING"], function () {
                ref.playingListener();
            });

            this._dashjs.on(events["PLAYBACK_PAUSED"], function () {
                ref.pauseListener();
            });

            this._dashjs.on(events["PLAYBACK_PROGRESS"], function () {
                // ...
            });

            this._dashjs.on(events["PLAYBACK_ENDED"], function () {
                ref.endedListener(null);
            });

            this._dashjs.on(events["CAN_PLAY"], function () {

                var qualityList = ref._getQualityList();

                if (ref._qualityMap === null) {
                    ref._qualityMap = {};
                }

                for (var i = 0; i < qualityList.length; i++) {
                    ref._qualityMap[qualityList[i]] = i;
                }

                ref.sendUpdate('availableQualitiesChange', qualityList);
                ref.displayReady();
                ref.ready();

                ref.canplayListener(null);
            });

            this._dashjs.on(events["BUFFER_EMPTY"], function () {
                ref._setBufferState('EMPTY');
            });

            this._dashjs.on(events["MANIFEST_LOADED"], function () {
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
                playready = null,
                widevine = null,
                buffer = {}

            if (typeof this._file['drm'] === "object") {
                for (var i = 0; i < this._file['drm'].length; i++) {
                    var item = this._file['drm'][i];

                    if (typeof drmConfig[item] === "string") {
                        buffer[item] = drmConfig[item];
                    }
                }
            }

            // Initialize dash.js MediaPlayer
            this._dashjs.initialize(this._video, null, false);

            this._dashjs.setProtectionData({
                "com.microsoft.playready": {
                    serverURL: buffer['playready'] || null
                },
                "com.widevine.alpha": {
                    serverURL: buffer['widevine'] || null
                }
            });

            this._dashjs.attachSource(this._file['src']);
        },

        /**
         * `_fetchDashJs` return `window.dashjs` if it's available.
         * Otherwise load DashJS lib from URL.
         * 
         * @param {function|null} cb
         *        {function} Callback function called after successufll load of DashJS lib
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
        setPlay: function () {
            this._dashjs.play();
            this._setState('playing');
        },

        setPause: function () {
            this._dashjs.pause();
            this._setState('paused');
        },

        setSeek: function (newpos) {
            var ref = this;

            ref._dashjs.seek(newpos);

            ref.timeListener({
                position: newpos
            });

        },

        setVolume: function (value) {

            if (!!this._dashjs) {
                this._dashjs.setVolume(value);
            }

            if (this.mediaElement === null) {
                this.volumeListener(value);
            }

        },

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
        getVolume: function () {

            var v = 0;

            try {
                v = this._dashjs.getVolume();
            } catch (err) {
                v = this._volume;
            };

            return v;

        },

        getQuality: function () {
            return this._quality;
        }

    }, 'VIDEO');
});