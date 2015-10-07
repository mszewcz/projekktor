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

jQuery(function ($) {
$p.userAgent = (function (window, document, undefined) {
    
    function isMobile(){
        if(navigator.userAgent.search(/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i) > -1){
            return true;
        }
        else {
            return false;
        }
    }
    
    /**
    * Detect Vendor Prefix with JavaScript
    * CREDITS: http://davidwalsh.name/vendor-prefix
    */
    function vendorPrefix(){
        var styles = window.getComputedStyle(document.documentElement, ''),
                pre = (Array.prototype.slice
                        .call(styles)
                        .join('')
                        .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
                        )[1],
                dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
        return {
            dom: dom,
            lowercase: pre,
            css: '-' + pre + '-',
            js: this.ucfirst(pre)
        };
    }
    
    return {
        string: navigator.userAgent,
        platform: '',
        browser: '',
        version: {
            string: '',
            major: 0,
            minor: 0,
            patch: 0
        },
        prefix: vendorPrefix(),
        isMobile: isMobile()
    };
})(window, document);
});