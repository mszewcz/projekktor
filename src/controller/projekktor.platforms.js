/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * Copyright 2014 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 * 
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */

jQuery(function ($) {

    $p.platforms = {
        
        VLC: function () {
            // we are interested in VLC Web Plugin v2 only
            var result = $p.utils.detectPlugin('"VLC Web Plugin"', 'application/x-vlc-plugin', 'VideoLAN.VLCPlugin.2', function (ax) {
                var version = [],
                    d = ax['VersionInfo'] || ax.versionInfo || false;
                if (d) {
                    d = d.split(" ")[0].split(".");
                    version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
                }
                return version;
            });

            return result.join(".");
        },
        
        /* returns the version of the flash player */
        FLASH: function () {
            var result = $p.utils.detectPlugin('Shockwave Flash', 'application/x-shockwave-flash', 'ShockwaveFlash.ShockwaveFlash', function (ax) {
                // adapted from SWFObject
                var version = [],
                    d = ax.GetVariable("$version");
                if (d) {
                    d = d.split(" ")[1].split(",");
                    version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
                }
                return version;
            });

            return result.join(".");
        },
        
        SILVERLIGHT: function () {
            var result = $p.utils.detectPlugin('Silverlight Plug-In', 'application/x-silverlight-2', 'AgControl.AgControl', function (ax) {
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
            });

            return result.join(".");
        },
        
        ANDROID: function () {
            try {
                return (navigator.userAgent.toLowerCase().match(/android\s+(([\d\.]+))?/)[1]).toString();
            } catch (e) {
            }
            return "0";
        },
        
        IOS: function () {
            var agent = navigator.userAgent.toLowerCase(),
                start = agent.indexOf('os ');
            
            if ((agent.indexOf('iphone') > -1 || agent.indexOf('ipad') > -1) && start > -1) {
                return (agent.substr(start + 3, 3).replace('_', '.')).toString();
            }
            return "0";
        },
        
        NATIVE: function (type) {
            try {
                var testObject = $((type.indexOf('video') > -1) ? '<video/>' : '<audio/>').get(0);
                if (testObject.canPlayType != null) {
                    if (type === '*') {
                        return "1";
                    }
                    switch (testObject.canPlayType(type)) {
                        case "no":
                        case "":
                            return "0";
                            // case "maybe":			
                            // case "probably":
                        default:
                            return "1";
                    }
                }
            } catch (e) {
            }
            return "0";
        },
        
        BROWSER: function () {
            return "1";
        }
    };
});
