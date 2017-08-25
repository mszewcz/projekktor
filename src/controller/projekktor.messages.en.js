var projekktorMessages = (function(window, document, $, $p){

    "use strict";
    
return {

    // controlbar
    "play": "start playback",
    "pause": "pause playback",

    // settings
    "help": "help:",
    "keyboard controls": "keyboard",
    "debug": "debug",
    "player info": "player info",
    "auto": "automatic",
    "quality": "quality",
    "high": "high",
    "medium": "medium",
    "low": "low",

    // platforms
    "platform": "platform",

    // Adobe Flash
    "platform_flash": "Flash",
    "platform_flash_info": "<a href='http://www.adobe.com/go/getflashplayer' target='_blank'>Get Adobe Flash player</a>",

    // Silverlight
    "platform_silverlight": "Silverlight",
    "platform_silverlight_info": "<a href='http://go.microsoft.com/fwlink/?LinkID=149156' target='_blank'>Get Microsoft Silverlight</a>",

    // Native <video>
    "platform_native": "HTML5",
    "platform_native_info": "Get one of the modern web browsers: <ul><li>Chrome</li><li>Edge</li><li>Firefox</li><li>Opera</li></ul>",

    "platform_vlc": "VLC Plugin",
    "platform_vlc_info": "",

    // MSE
    "platform_mse": "MSE",
    "pplatform_mse_info": "",

    // settings
    'ok': 'OK',
    'report': 'Report a bug',
    'cancel': 'cancel',
    'continue': 'continue',
    'sendto': 'Please send this information to the webmaster of this site.',
    'please': 'Please describe your problem as detailed as possible....',
    'thanks': 'Thank you very much.',
    'error': 'An error occurred',
    'help1': '<em>space</em> play / pause',
    'help2': '<em>up</em><em>down</em> volume <em>left</em><em>right</em> scrub',
    'help3': '<em>ENTER</em> toggle fullscreen',
    'help4': 'Mouse must hover the player.',

    // flash & native:
    "error0": '#0 An (unknown) error occurred.',
    "error1": '#1 You aborted the media playback. ',
    "error2": '#2 A network error caused the media download to fail part-way. ',
    "error3": '#3 The media playback was aborted due to a corruption problem. ',
    "error4": '#4 The media (%{title}) could not be loaded because the server or network failed.',
    "error5": '#5 Sorry, your browser does not support the media format of the requested file.',
    "error6": '#6 Your client is in lack of the Flash Plugin V%{flashver} or higher.',
    "error7": '#7 No media scheduled.',
    "error8": '#8 ! Invalid media model configured !',
    "error9": '#9 File (%{file}) not found.',
    "error10": '#10 Invalid or missing quality settings for %{title}.',
    "error11": '#11 Invalid streamType and/or streamServer settings for %{title}.',
    "error12": '#12 Invalid or inconsistent quality setup for %{title}.',
    "error13": '#13 Invalid playlist or missing/broken playlist parser. No media scheduled.',
    "error20": '#20 Invalid or malicious parser applied',
    "error80": '#80 The requested file does not exist or is delivered with an invalid content-type.',
    "error97": 'No media scheduled.',
    "error98": 'Invalid or malformed playlist data!',
    "error99": 'Click display to proceed. ',
    "error100": 'Keyboard Shortcuts',

    "error200": 'Loading timeout',

    // DRM errors
    "error300": "#300 No support for any of the DRM systems used to encrypt this media.",

    // youtube errors:
    "error500": 'This Youtube video has been removed or set to private',
    "error501": 'The Youtube user owning this video disabled embedding.',
    "error502": 'Invalid Youtube Video-Id specified.'

};

}(window, document, jQuery, projekktor));