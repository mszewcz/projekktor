/*
 * this file is part of:
 * projekktor player
 * http://www.projekktor.com
 *
 * Copyright 2016 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 * 
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 * 
 * This model is interfacing hls.js library
 *
 * hls.js
 * Author: Guillaume du Pontavice
 * Website: https://github.com/dailymotion/hls.js
 * License: Apache 2.0 License
 * 
 */

jQuery(function($) {
$p.newModel({

    modelId: 'MSEVIDEOHLS',
    
    mseVersion: '1',

    platform: 'mse',
    
    iLove: [
        {ext:'m3u8', type:'application/x-mpegurl', platform:['mse'], streamType: ['http', 'httpVideo', 'httpVideoLive']},
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform:['mse'], streamType: ['http', 'httpVideo', 'httpVideoLive']}
    ]
}, 'VIDEO');

$p.newModel({

    modelId: 'MSEAUDIOHLS',
    
    mseVersion: '1', 
    platform: 'mse',
    
    iLove: [
        {ext:'m3u8', type:'application/vnd.apple.mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u', type:'application/vnd.apple.mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u8', type:'application/x-mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u', type:'application/x-mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u8', type:'audio/mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u', type:'audio/mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u8', type:'audio/x-mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']},
        {ext:'m3u', type:'audio/x-mpegurl', platform: ['mse'], streamType: ['http','httpAudio', 'httpAudioLive']}
    ]
}, 'MSEVIDEOHLS');
});
