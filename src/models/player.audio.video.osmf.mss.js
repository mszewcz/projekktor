/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2015 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
*/

(function(window, document, $, $p){

    "use strict";

$p.newModel({
    modelId: 'OSMFVIDEOMSS',
    iLove: [
        {ext:'manifest', type:'application/vnd.ms-ss', platform: ['flash']}
    ]
}, 'OSMFVIDEO');

$p.newModel({
    modelId: 'OSMFAUDIOMSS',
    iLove: [
        {ext:'manifest', type:'application/vnd.ms-ss', platform: ['flash']}
    ]
}, 'OSMFAUDIO');

}(window, document, jQuery, projekktor));