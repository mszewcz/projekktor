(function (window, document, $, $p) {

    "use strict";

        var drmSystems = {
                widevine: ['com.widevine.alpha'],
                playready: ['com.microsoft.playready', 'com.youtube.playready'],
                clearkey: ['webkit-org.w3.clearkey', 'org.w3.clearkey'],
                primetime: ['com.adobe.primetime', 'com.adobe.access'],
                fairplay: ['com.apple.fairplay']
            },
            supportedDrmSystems = [],
            emeType = getEmeType(),
            testConfig = [{
                initDataTypes: ['cenc', 'webm'],
                sessionTypes: ['temporary'],
                audioCapabilities: [{
                        contentType: 'audio/mp4; codecs="mp4a.40.5"',
                        robustness: 'SW_SECURE_CRYPTO'
                    },
                    {
                        contentType: 'audio/mp4; codecs="mp4a.40.2"',
                        robustness: 'SW_SECURE_CRYPTO'
                    },
                    {
                        contentType: 'audio/webm; codecs="vorbis"',
                        robustness: 'SW_SECURE_CRYPTO'
                    },
                ],
                videoCapabilities: [{
                        contentType: 'video/webm; codecs="vp9"',
                        robustness: 'HW_SECURE_ALL'
                    },
                    {
                        contentType: 'video/webm; codecs="vp9"',
                        robustness: 'SW_SECURE_DECODE'
                    },
                    {
                        contentType: 'video/mp4; codecs="avc1.640028"',
                        robustness: 'HW_SECURE_ALL'
                    },
                    {
                        contentType: 'video/mp4; codecs="avc1.640028"',
                        robustness: 'SW_SECURE_DECODE'
                    },
                    {
                        contentType: 'video/mp4; codecs="avc1.4d401e"',
                        robustness: 'HW_SECURE_ALL'
                    },
                    {
                        contentType: 'video/mp4; codecs="avc1.4d401e"',
                        robustness: 'SW_SECURE_DECODE'
                    },
                ],
            }];

        function getEmeType() {

            if (navigator.requestMediaKeySystemAccess &&
                MediaKeySystemAccess.prototype.getConfiguration) {
                return 'eme'; // current EME as of 16 March 2017
            } else if (HTMLMediaElement.prototype.webkitGenerateKeyRequest) {
                return 'webkit'; // webkit-prefixed EME v0.1b
            } else if (HTMLMediaElement.prototype.generateKeyRequest) {
                return 'oldunprefixed'; // nonprefixed EME v0.1b
            } else if (window.MSMediaKeys) {
                return 'ms'; // ms-prefixed EME v20140218
            } else {
                return 'none'; // EME unavailable
            }
        }

        function msIsTypeSupportedPromissified(keySystem) {
            return new Promise(function (resolve, reject) {
                var e;
                if (window.MSMediaKeys.isTypeSupported && window.MSMediaKeys.isTypeSupported(keySystem)) {
                    resolve({
                        keySystem: keySystem
                    });
                } else {
                    e = new Error('Unsupported keySystem');
                    e.name = 'NotSupportedError';
                    e.code = DOMException.NOT_SUPPORTED_ERR;
                    reject(e);
                    throw e;
                }
            });
        }

        function getSupportedDrmSystems() {
            var ref = this,
                isKeySupported,
                promises = [];

            if (emeType === 'eme') {
                isKeySupported = window.navigator.requestMediaKeySystemAccess.bind(window.navigator);
            } 
            else if (emeType === 'ms') {
                isKeySupported = msIsTypeSupportedPromissified;
            }
            else {
                // if there is no EME then resolve promise immediately
                return Promise.resolve();
            }

            Object.keys(drmSystems).forEach(function(keySystemName) {
                var keySystemNS = drmSystems[keySystemName];

                keySystemNS.forEach(function (ks) {
                    promises.push(isKeySupported(ks, testConfig).then(
                        function (val) {
                            supportedDrmSystems.push(keySystemName);
                        },
                        function (error) {
                            // skip
                        }
                    ));
                }, ref);
            });

            return Promise.all(promises);
        };

        $p.initPromises.push(
            getSupportedDrmSystems().then(function (val) {
                console.warn("DRM DONE", supportedDrmSystems);
                $p.drm = {
                    supportedDrmSystems: supportedDrmSystems,
                    drmSystems: drmSystems,
                    emeType: emeType
                };
                return Promise.resolve();
            })
        );
}(window, document, jQuery, projekktor));