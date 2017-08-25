/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
*/
(function(window, document, $, $p){

    "use strict";
    
$p.newModel({
    modelId: 'NA',
    iLove: [
        {ext:'na', type:'none/none', platform: ['browser']}
    ],
    hasGUI: true,

    applyMedia: function(destContainer) {

        destContainer.html('');
        this.displayReady();

        this.sendUpdate( 'error', this.media.errorCode);

        if (!this.pp.getConfig('enableTestcard')) {
            if(this.media.file.length && this.media.file[0].src) {
                window.location.href = this.media.file[0].src;
            }
        }
    }
});

}(window, document, jQuery, projekktor));