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

    var testVideoEl = document.createElement('video'),
    silverlightVer,
    flashVer;

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

        /* returns the version of the flash player */
        flash: function () {
            if (!flashVer) {
                flashVer = $p.utils.detectPlugin('Shockwave Flash', 'application/x-shockwave-flash', 'ShockwaveFlash.ShockwaveFlash', function (ax) {
                    // adapted from SWFObject
                    var version = [],
                        d = ax.GetVariable("$version");
                    if (d) {
                        d = d.split(" ")[1].split(",");
                        version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
                    }
                    return version;
                }).join(".");
            }

            return flashVer;
        },

        silverlight: function () {
            if (!silverlightVer) {
                silverlightVer = $p.utils.detectPlugin('Silverlight Plug-In', 'application/x-silverlight-2', 'AgControl.AgControl', function (ax) {
                    // Silverlight cannot report its version number to IE
                    // but it does have a isVersionSupported function, so we have to loop through it to get a version number.
                    // adapted from http://www.silverlightversion.com/
                    var v = [0, 0, 0, 0],
                        loopMatch = function (ax, v, i, n) {
                            while (ax.isVersionSupported(v[0] + "." + v[1] + "." + v[2] + "." + v[3])) {
                                v[i] += n;
                            }
                            v[i] -= n;
                        };
                    loopMatch(ax, v, 0, 1);
                    loopMatch(ax, v, 1, 1);
                    loopMatch(ax, v, 2, 10000); // the third place in the version number is usually 5 digits (4.0.xxxxx)
                    loopMatch(ax, v, 2, 1000);
                    loopMatch(ax, v, 2, 100);
                    loopMatch(ax, v, 2, 10);
                    loopMatch(ax, v, 2, 1);
                    loopMatch(ax, v, 3, 1);

                    return v;
                }).join(".");
            }
            return silverlightVer;

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
