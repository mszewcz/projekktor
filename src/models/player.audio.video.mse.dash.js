
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
         * Metoda `_initMedia` przygotowywuje odtwarzacz DashJS do działania.
         * 
         * @param {object} destContainer
         *        Kontener dla tagu HTML `video`
         */
        _initMedia: function (destContainer) {
            var ref = this;


            ///// Etap 1:
            // Tworzę instancję klasy "DashJS > MediaPlayer".
            this._dashjs = this.DASHJS.MediaPlayer().create();

            if (this._isLocalhost()) {
                this._dashjs.getDebug().setLogToBrowserConsole(true);
            } else {
                this._dashjs.getDebug().setLogToBrowserConsole(false);
            }

            // Ustawiam bufory:
            // this._dashjs.setBufferPruningInterval(3);
            // this._dashjs.setBufferTimeAtTopQuality(3);
            // this._dashjs.setBufferTimeAtTopQualityLongForm(6);
            // this._dashjs.setBufferToKeep(3);
            // this._dashjs.setRichBufferThreshold(2);
            // this._dashjs.setStableBufferTime(3);

            this.setQuality('auto');


            ///// Etap 2:
            // Szukam tagu 'video' i przypisuję uchwyt do zmiennej `this._video`,
            // jeżeli NIE znajdę tagu to go tworzę.
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


            ///// Etap 3:
            // Podpinam zdarzenia do `this._dashjs`.
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

                var qualityList = ref._getQualityList()

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


            ///// Etap 5:
            // Stosuję (ustawiam) źródło mediów (+ licencji dla DRM)
            this.applySrc();

        },

        _isLocalhost: function () {
            if (window.location.host === "127.0.0.1") {
                return true;
            } else if (window.location.host === "localhost") {
                return true;
            } else {
                return false;
            }
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

        /**
         * Metoda `applySrc` ustawia adres źródła mediów.
         */
        applySrc: function () {
            // Inicjuje MediaPlayer z biblioteki "Dash JS":
            this._dashjs.initialize(this._video, null, false);

            this._dashjs.setProtectionData({
                "com.microsoft.playready": {
                    serverURL: this._file['playready'] || null
                },
                "com.widevine.alpha": {
                    serverURL: this._file['widevine'] || null
                }
            });

            this._dashjs.attachSource(this._file['src']);
        },

        /**
         * Metoda `_fetchDashJs` zwraca obiekt `window.dashjs` gdy jest dostępny.
         * W przeciwnym wypadku ładuję bibliotekę DashJS, a po zakończaniu ładowania zwraca `window.dashjs`.
         * 
         * @param {function|null} cb
         *        {function} Funkcja zwrotna wywoływana gdy biblioteka DashJS zostanie załadowana
         *                   Wywołanie `cb(dashjs)`
         *                  `dashjs` zawiera referencję do biblioteki DashJS.
         *        {null} Brak wywołania zwrotnego!
         */
        _fetchDashJs: function (cb) {
            if (typeof window.dashjs === "object") {
                cb(window.dashjs);
            } else {
                var url;

                if (this._isLocalhost()) {
                    url = "//cdn.dashjs.org/latest/dash.all.debug.js";
                } else {
                    url = this.pp.getConfig('platformsConfig').mse.src;
                }

                $p.utils.getScript(url, {
                    cache: true
                }).done(function () {
                    if (typeof window.dashjs === "object") {
                        cb(window.dashjs);
                    } else {
                        console.error("Variable `window.dashjs` is not `object` !!!");
                    }
                }).fail(function () {
                    console.error("Error load dash.js !!!");
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

    });
});