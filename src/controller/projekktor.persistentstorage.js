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
var projekktorPersistentStorage = (function (window, document, $, $p){

    "use strict";
    
function projekktorPersistentStorage(pp){
    this.pp = pp;
}

projekktorPersistentStorage.prototype = (function () {
    var persistentStorage = {

        save: function (key, value) {
            var ns = this.pp.getNS(),
                nskey = ns + '_' + key;

            if (window.$p.features.localstorage) {
                try {
                    window.localStorage.setItem(nskey, JSON.stringify(value));
                    return true;
                } catch (e) {
                    return false;
                }
            }
        },

        restore: function (key) {
            var ns = this.pp.getNS(),
                nskey = ns + '_' + key;

            if (window.$p.features.localstorage){
                try {
                    return JSON.parse(window.localStorage.getItem(nskey));
                } catch (e) {}
            }
        },

        remove: function(key) {
            var ns = this.pp.getNS(),
                nskey = ns + '_' + key;

            if (window.$p.features.localstorage){
                try {
                    window.localStorage.removeItem(nskey);
                } catch (e) {}
            }
        },

        list: function() {
            var ns = this.pp.getNS() + '_',
                regexp = new RegExp('^' + ns),
                result = {},
                key;

            if (window.$p.features.localstorage){
                try {
                    for (key in window.localStorage){
                        if(regexp.test(key)){
                            result[key] = window.localStorage.getItem(key);
                        }
                    }
                } catch (e) {}
            }

            return result;
        },

        clear: function() {
            var ns = this.pp.getNS() + '_',
                regexp = new RegExp('^' + ns),
                key;

            if (window.$p.features.localstorage){
                try {
                    for (key in window.localStorage){
                        if(regexp.test(key)){
                            window.localStorage.removeItem(key);
                        }
                    }
                } catch (e) {}
            }
        }
    };

    return persistentStorage;
})();

return projekktorPersistentStorage;

}(window, document, jQuery, projekktor));