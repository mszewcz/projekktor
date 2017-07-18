(function(window, document, $, $p){

    $p.drm = (function () {
        
        var drm = {},
            drmSystems = {
                widevine: ['com.widevine.alpha'],
                playready: ['com.microsoft.playready', 'com.youtube.playready'],
                clearkey: ['webkit-org.w3.clearkey', 'org.w3.clearkey'],
                primetime: ['com.adobe.primetime', 'com.adobe.access'],
                fairplay: ['com.apple.fairplay']
            },
            testVideoEl = document.createElement('video'),
            supportedDrmSystems = [],
            emeType = undefined,
            testConfig = [{
                initDataTypes: ['cenc', 'webm'],
                sessionTypes: ['temporary'],
                audioCapabilities: [
                    {
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
                videoCapabilities: [
                    {
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

        function getSupportedDrmSystems() {
            if (window.navigator.requestMediaKeySystemAccess) {
                if (typeof window.navigator.requestMediaKeySystemAccess === 'function') {
                    emeType = 'eme';
                    var isKeySystemSupported = function (keySystem) {
                        if (window.navigator.requestMediaKeySystemAccess) {
                            window.navigator.requestMediaKeySystemAccess(keySystem, testConfig)
                                .then(function (keySystemAccess) {
                                    supportedDrmSystems.push(keySystem);
                                })
                                .catch(function (keySystemAccess) {  
                                    // ignore
                                });
                        }
                    };
                    var keysys, dummy;
                    for (keysys in drmSystems) {
                        if (drmSystems.hasOwnProperty(keysys)) {
                            for (dummy in drmSystems[keysys]) {
                                isKeySystemSupported(drmSystems[keysys][dummy]);
                            }
                        }
                    }
                }
            } else if (window.MSMediaKeys) {
                if (typeof window.MSMediaKeys === 'function') {
                    emeType = 'ms';
                    var keysys, dummy;
                    for (keysys in drmSystems) {
                        if (drmSystems.hasOwnProperty(keysys)) {
                            for (dummy in drmSystems[keysys]) {
                                if (window.MSMediaKeys.isTypeSupported(drmSystems[keysys][dummy])) {
                                    supportedDrmSystems.push(drmSystems[keysys][dummy]);
                                }
                            }
                        }
                    }
                }
            } else if (testVideoEl.webkitGenerateKeyRequest) {
                if (typeof testVideoEl.webkitGenerateKeyRequest === 'function') {
                    emeType = 'webkit';
                    var keysys, dummy;
                    for (keysys in drmSystems) {
                        if (drmSystems.hasOwnProperty(keysys)) {
                            for (dummy in drmSystems[keysys]) {
                                if (testVideoEl.canPlayType('video/mp4', drmSystems[keysys][dummy])) {
                                    supportedDrmSystems.push(drmSystems[keysys][dummy]);
                                }
                            }
                        }
                    }
                }
            }
        }

       getSupportedDrmSystems();

        drm = {
            supportedDrmSystems: supportedDrmSystems,
            drmSystems: drmSystems,
            emeType: emeType
        }

        return drm;

    })();

}(window, document, jQuery, projekktor));