/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * Copyright 2014-2017 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 *
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */

(function(window, document, $, $p){

    "use strict";
    
    var testVideoEl = document.createElement('video');

    $p.platforms = {
        videojs: function() {
            return "1";
        },

        /**
         * returns 1 if MSE is available 0 otherwise
         */
        mse: function() {
            return $p.features.mse ? "1" : "0";
        },

        android: function () {
            if($p.userAgent.os.name === "Android"){
                return $p.userAgent.os.version || "0";
            }
            return "0";
        },

        ios: function () {
            if($p.userAgent.os.name === "iOS"){
                return $p.userAgent.os.version || "0";
            }
            return "0";
        },

        native: function (type) {
            switch (testVideoEl.canPlayType(type)) {
                    case null:
                    case "no":
                    case "":
                        return "0";
                    case "maybe":
                    case "probably":
                    default:
                        return "1";
            }
        },
        
        browser: function () {
            return "1";
        }
    };
    
}(window, document, jQuery, projekktor));
