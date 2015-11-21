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
var projekktorPersistentStorage = function(pp){
    this.pp = pp;
};

jQuery(function ($) {
projekktorPersistentStorage.prototype = (function (window, document, undefined) {
    var persistentStorage = {
        
        save: function (key, value) {
            var ns = this.pp.getNS()+'_';
            
            if (window.$p.features.localstorage) {
                try {
                    window.localStorage.setItem(ns + key, value);
                    return true;
                } catch (e) {
                    return false;
                }
            }
        },
        
        restore: function (key) {
            var ns = this.pp.getNS()+'_';
            
            if (window.$p.features.localstorage){
                try {
                    return JSON.parse(window.localStorage.getItem(ns + key));
                } catch (e) {}
            }
        },
        
        remove: function(key) {
            var ns = this.pp.getNS()+'_';
            
            if (window.$p.features.localstorage){
                try {
                    window.localStorage.removeItem(ns + key);
                } catch (e) {}
            }
        },
        
        clear: function() {
            var ns = this.pp.getNS()+'_',
                key;
            
            if (window.$p.features.localstorage){
                try {
                    for (key in window.localStorage){
                        if(key.indexOf(ns) > -1){
                            window.localStorage.removeItem(key);
                        }
                    }
                } catch (e) {}
            }
        }
    };
    
    return persistentStorage;
})(window, document);
});