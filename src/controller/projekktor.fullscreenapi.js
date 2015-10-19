/*
 * this file is part of: 
 * projekktor zwei
 * http://www.projekktor.com 
 *
 * Copyright 2015 Radosław Włodkowski, radoslaw@wlodkowski.net
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 * 
 */
jQuery(function ($) {
$p.fullscreenApi = (function (window, document, undefined) {
    
    var videoElement = document.createElement('video'),
    fsApiVersionsMap = {
        /*
         * mediaonly API applies to HTMLVideoElement, mainly on iOS and Android devices (WebKit)
         */
        mediaonly: {
            /*
             * Methods
             */ 
            enterFullscreen: ['enterFullscreen', 'enterFullScreen'],
            exitFullscreen: ['exitFullscreen', 'exitFullScreen', 'cancelFullScreen', 'cancelFullscreen'],
            /*
             * Properties 
             */
            supportsFullscreen: ['supportsFullscreen', 'supportsFullScreen'],
            displayingFullscreen: ['displayingFullscreen', 'fullScreen', 'isFullScreen', 'isFullscreen'],
            /*
             * Events
             */
            beginfullscreen: 'webkitbeginfullscreen', // webkit specyfic, NOTE: this event is unexposed 
            // in the newest versions of WebKit based browsers, but it's still dispatched
            endfullscreen: 'webkitendfullscreen' // ditto
        },
        /*
         * HTML5 fully blown fullscreen API in different flavours. There are differences in function names 
         * and naming conventions between implementations of fullscreen API so we list all of known versions 
         * and map them to those specified in WHATWG Fullscreen API Living Standard — Last Updated 29 September 2015.
         * Eventually we are trying to determine which combination does current browser use (if any).
         */
        full: {
            /*
             * Methods
             */ 
            // HTMLElement
            requestFullscreen: ['requestFullscreen', 'requestFullScreen', 'enterFullscreen', 'enterFullScreen'],
            // DOMDocument
            exitFullscreen: ['exitFullscreen', 'exitFullScreen', 'cancelFullScreen', 'cancelFullscreen'],
            /*
             * Properties 
             */
            // DOMDocument property informing if you can use the API
            fullscreenEnabled: ['fullscreenEnabled', 'fullScreenEnabled', 'supportsFullscreen', 'supportsFullScreen'],
            // DOMDocument property returning element which is currently in the fullscreen stage
            fullscreenElement: ['fullscreenElement', 'fullScreenElement', 'currentFullScreenElement'],
            // DOMDocument property informing if the browser is currently in the fullscreen stage. There is no W3C proposal for this property.
            isFullscreen: ['fullScreen', 'isFullScreen', 'isFullscreen', 'displayingFullscreen', 'displayingFullScreen'],
            /*
             * Events
             */
            // fired on DOMDocument 
            // NOTE: Internet Explorer 11 and IEMobile on Windows Phone 8.1 are using cammelcase, prefixed, event names
            // for addEventListener (e.g. MSFullscreenChange) but have lowercase event names in document object (e.g. onmsfullscreenchange)
            // so in this case detection is useless cause when we detect lowercase event name we can't use it with addEventListener
            // - there is need for exception
            fullscreenchange: ['onfullscreenchange', 'onwebkitfullscreenchange', 'onmozfullscreenchange'], 
            fullscreenerror: ['onfullscreenerror', 'onwebkitfullscreenerror', 'onmozfullscreenerror']
        }
    },
    /**
     * this object contains proper names for current UA native fullscreen API functions, 
     * properties and events
     */
    fullscreenApi = {
        type: 'none',
        mediaonly: {
            enterFullscreen: '',
            exitFullscreen: '',
            supportsFullscreen: '',
            displayingFullscreen: '',
            beginfullscreen: 'webkitbeginfullscreen', // because in the newest versions of WebKit based browsers this event is unexposed, 
            // but it is still dispatched the string value is fixed (not detected)
            endfullscreen: 'webkitendfullscreen' // ditto
        },
        /*
         * HTML5 fully blown fullscreen API in different flavours. There are differences in function names 
         * and naming conventions between implementations of fullscreen API so we list all of known versions 
         * and map them to those specified in WHATWG Fullscreen API Living Standard — Last Updated 29 September 2015.
         * Eventually we are trying to determine which combination does current browser use (if any).
         */
        full: {
            requestFullscreen: '',
            exitFullscreen: '',
            fullscreenEnabled: '',
            fullscreenElement: '',
            isFullscreen: '',
            fullscreenchange: '',
            fullscreenerror: '',
        }
    },
    prefix = $p.userAgent.prefix.lowercase;
    
    // find if there are two distinctive values
    fullscreenApi.mediaonly.enterFullscreen = $p.utils.hasProp(videoElement, fsApiVersionsMap.mediaonly.enterFullscreen.slice(), prefix);
    fullscreenApi.full.exitFullscreen = $p.utils.hasProp(document, fsApiVersionsMap.full.exitFullscreen.slice(), prefix);
    
    // if there is full fullscreen API support then of course the mediaonly is also supported
    if (!!fullscreenApi.full.exitFullscreen) {
        fullscreenApi.type = 'full';
    }
    else if (!!fullscreenApi.mediaonly.enterFullscreen) {
        fullscreenApi.type = 'mediaonly';
    }
    
    // detect versions of all other functions/properties/events
    switch(fullscreenApi.type){
        case 'mediaonly':
            fullscreenApi.mediaonly.exitFullscreen       = $p.utils.hasProp(videoElement, fsApiVersionsMap.mediaonly.exitFullscreen.slice(), prefix);
            fullscreenApi.mediaonly.supportsFullscreen   = $p.utils.hasProp(videoElement, fsApiVersionsMap.mediaonly.supportsFullscreen.slice(), prefix);
            fullscreenApi.mediaonly.displayingFullscreen = $p.utils.hasProp(videoElement, fsApiVersionsMap.mediaonly.displayingFullscreen.slice(), prefix);
        break;
        
        case 'full':
            fullscreenApi.full.requestFullscreen = $p.utils.hasProp(videoElement, fsApiVersionsMap.full.requestFullscreen.slice(), prefix);
            fullscreenApi.full.fullscreenEnabled = $p.utils.hasProp(document, fsApiVersionsMap.full.fullscreenEnabled.slice(), prefix);
            fullscreenApi.full.fullscreenElement = $p.utils.hasProp(document, fsApiVersionsMap.full.fullscreenElement.slice(), prefix);
            fullscreenApi.full.isFullscreen      = $p.utils.hasProp(document, fsApiVersionsMap.full.isFullscreen.slice(), prefix);
            
            // Internet Explorer 11 and IEMobile on Windows Phone 8.1
            if(prefix === 'ms'){
                fullscreenApi.full.fullscreenchange = 'onMSFullscreenChange';
                fullscreenApi.full.fullscreenerror = 'onMSFullscreenError';
            }
            else {
                fullscreenApi.full.fullscreenchange  = $p.utils.hasProp(document, fsApiVersionsMap.full.fullscreenchange.slice());
                fullscreenApi.full.fullscreenerror   = $p.utils.hasProp(document, fsApiVersionsMap.full.fullscreenerror.slice());
            }
        break;
    }

    return fullscreenApi;
})(window, document);
});