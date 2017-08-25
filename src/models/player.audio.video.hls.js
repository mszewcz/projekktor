/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2014, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
*/
(function(window, document, $, $p){
    
    "use strict";
    
$p.newModel({
    modelId: 'VIDEOHLS',
    androidVersion: '4.1',
    iosVersion: '5.0',
    iLove: [
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'application/vnd.apple.mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u8', type:'application/x-mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'application/x-mpegurl', platform: ['ios', 'android', 'native']}
    ]
}, 'VIDEO');

$p.newModel({
    modelId: 'AUDIOHLS',
    androidVersion: '4.1',
    iosVersion: '5.0',
    iLove: [
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'application/vnd.apple.mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u8', type:'application/x-mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'application/x-mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u8', type:'audio/mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'audio/mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u8', type:'audio/x-mpegurl', platform: ['ios', 'android', 'native']},
        {ext:'m3u', type:'audio/x-mpegurl', platform: ['ios', 'android', 'native']}
    ]
}, 'AUDIO');

}(window, document, jQuery, projekktor));