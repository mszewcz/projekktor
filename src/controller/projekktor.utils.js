(function (window, document, $, $p) {

    $p.utils = {
        imageDummy: function () {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABBJREFUeNpi/v//PwNAgAEACQsDAUdpTjcAAAAASUVORK5CYII=';
        },
        videoDummy: function (type) {
            switch (type) {
                case 'mp4':
                default:
                    // black 256x144 (16:9) h264/AAC - 1s
                    return 'data:video/mp4;base64,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';
            }
        },
        /**
         * blocks text selection attempts by the user for the given obj
         * @private
         * @param (Object) Object
         */
        blockSelection: function (dest) {
            if (dest) {

                dest.css({
                    "-webkit-touch-callout": "none",
                    /* iOS Safari */
                    "-webkit-user-select": "none",
                    /* Safari */
                    "-khtml-user-select": "none",
                    /* Konqueror HTML */
                    "-moz-user-select": "none",
                    /* Firefox */
                    "-ms-user-select": "none",
                    /* IE 11 / Edge */
                    "user-select": "none" /* Non-prefixed version */
                });
            }
            return dest;
        },
        unique: function (arr) {
            return Array.from(new Set(arr));
        },
        intersect: function (array1, array2) {
            var aA = Array.from(new Set(array1)),
                setB = new Set(array2),
                intersection = new Set(aA.filter(function (val) {
                    return setB.has(val);
                }));

            return Array.from(intersection);
        },
        roundNumber: function (value, decimals) {
            return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
        },
        /* generates a random string of <length> */
        randomId: function (length) {
            var chars = "abcdefghiklmnopqrstuvwxyz",
                charsLen = chars.length,
                len = length || 8, // default to 8 char id
                result = '',
                r,
                i;

            for (i = 0; i < len; i++) {
                r = Math.floor(Math.random() * charsLen);
                result += chars.substr(r, 1);
            }
            return result;
        },
        toAbsoluteURL: function (s) {
            var l = location,
                h, p, f, i;

            if (s == null || s == '') {
                return '';
            }

            if (/^\w+:/.test(s)) {
                return s;
            }

            h = l.protocol + '//' + l.host;
            if (s.indexOf('/') === 0) {
                return h + s;
            }

            p = l.pathname.replace(/\/[^\/]*$/, '');
            f = s.match(/\.\.\//g);
            if (f) {
                s = s.substring(f.length * 3);
                for (i = f.length; i--;) {
                    p = p.substring(0, p.lastIndexOf('/'));
                }
            }

            return h + p + '/' + s;
        },
        /**
         * strips / trims
         * @public
         * @param (String) Da string to get processed
         * @return (String) Da trimmed string
         */
        strip: function (s) {
            return s.replace(/^\s+|\s+$/g, "");
        },
        /**
         * strips / trims
         * @public
         * @param (String) Da human readable time to parse
         * @return (Integer) Absolute seconds
         */
        toSeconds: function (t) {
            var s = 0.0;
            if (typeof t != 'string') {
                return t;
            }
            if (t) {
                var p = t.split(':');
                if (p.length > 3) {
                    p = p.slice(0, 3);
                }

                for (var i = 0; i < p.length; i++) {
                    s = s * 60 + parseFloat(p[i].replace(',', '.'));
                }
            }

            return parseFloat(s);
        },
        toTimeObject: function (secs) {
            var hours = Math.floor(secs / (60 * 60)),
                divisor_for_minutes = secs % (60 * 60),
                minutes = Math.floor(divisor_for_minutes / 60),
                divisor_for_seconds = divisor_for_minutes % 60,
                seconds = Math.floor(divisor_for_seconds);

            return {
                h: hours,
                m: minutes,
                s: seconds
            };
        },
        toTimeString: function (secs, noSecs) {
            var time = this.toTimeObject(secs),
                hours = time.h,
                minutes = time.m,
                seconds = time.s;

            if (hours < 10) {
                hours = "0" + hours;
            }
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            return (noSecs === true) ? hours + ':' + minutes : hours + ':' + minutes + ':' + seconds;
        },
        embedPlugin: function (pluginName, destObj, config, shield, shrinkShield) {

            var src = config.src || '',
                attributes = config.attributes || {},
                parameters = config.parameters || {},
                initVars = config.initVars || {},
                initVarsArray = [],
                result = '',
                htmlAttributes = '',
                htmlObject = '',
                htmlObjectParams = '',
                htmlEmbed = '',
                htmlEmbedParams = '',
                dest = destObj,
                key;

            // generate attributes for <embed> and <object> elements
            for (key in attributes) {
                if (attributes.hasOwnProperty(key)) {
                    htmlAttributes += key + '="' + attributes[key] + '" ';
                }
            }

            // generate <param> elements for <object> embed & attributes for <embed> from parameters
            for (key in parameters) {
                if (parameters.hasOwnProperty(key)) {
                    htmlObjectParams += '<param name="' + key + '" value="' + parameters[key] + '" />';
                    htmlEmbedParams += key + '="' + parameters[key] + '" ';
                }
            }

            // create array of initVars name=value pairs
            for (key in initVars) {
                if (initVars.hasOwnProperty(key)) {
                    initVarsArray.push(key + '=' + encodeURIComponent(initVars[key]));
                }
            }

            switch (pluginName) {

                case 'flash':
                    // <object>
                    htmlObject =
                        '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ' +
                        htmlAttributes + '>' +
                        '<param name="movie" value="' + src + '" />' +
                        '<param name="flashvars" value="' + initVarsArray.join('&amp;') + '" />' +
                        htmlObjectParams;

                    // <embed>
                    htmlEmbed =
                        '<embed type="application/x-shockwave-flash" pluginspage="//www.macromedia.com/go/getflashplayer" ' +
                        htmlAttributes +
                        htmlEmbedParams +
                        'src="' + config.src + '" ' +
                        'flashvars="' + initVarsArray.join('&') + '" ' +
                        '></embed>';

                    if (!document.all || window.opera) {
                        result = htmlEmbed;
                    } else {
                        result = htmlObject + htmlEmbed;
                        result += '</object>';
                    }

                    break;

                case 'silverlight':
                    htmlObject =
                        '<object data="data:application/x-silverlight-2," type="application/x-silverlight-2" ' +
                        htmlAttributes + '>' +
                        '<param name="source" value="' + src + '" />' +
                        '<param name="initParams" value="' + initVarsArray.join(',') + '" />' +
                        htmlObjectParams +
                        '</object>';

                    result = htmlObject;
                    break;
            }

            if (dest === null) {
                return result;
            }

            // jquerx 1.4.2 IE flash <object> issue workaround:
            // this does not work in IE: destObj.append(result);
            dest[0].innerHTML = result;

            if (shield !== false) {
                dest.append(
                    $('<div/>').attr('id', attributes.id + '_cc')
                    .css({
                        width: (shrinkShield) ? '1px' : '100%',
                        height: (shrinkShield) ? '1px' : '100%',
                        backgroundColor: 'transparent',
                        filter: 'alpha(opacity = 0.1)',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    })
                );
            }

            return $('#' + attributes.id);
        },
        /**
         * script that allows fetching a cached/uncached script
         * set options to {cache: true} if you want to cache requests
         */
        getScript: function (url, options) {
            options = $.extend(options || {}, {
                dataType: "script",
                url: url
            });

            return jQuery.ajax(options);
        },
        getCss: function (url, onload) {
            var css = $("<link>", {
                "rel": "stylesheet",
                "type": "text/css",
                "href": url
            });

            if (typeof callback === 'function') {
                css.on('load', onload);
            }

            if (url) {
                css.appendTo('head');
            }
        },
        /**
         * replaces {}-tags with parameter equivalents
         * @public
         * @param (String) Da string to get processed
         * @param (Object) Object holding data to fill in
         * @return (String) Da parsed string
         * OBSOLETE
         parseTemplate: function (template, data, encode) {

         if (data === undefined || data.length == 0 || typeof data != 'object') return template;

         for (var i in data) {
         template = template.replace(new RegExp('%{' + i + '}', 'gi'), ((encode === true) ? window.encodeURIComponent(data[i]) : data[i]))
         }
         template = template.replace(/%{(.*?)}/gi, '');
         return template;
         },
         */

        /**
         * stretches target to fit into specified dimensions keeping aspect ratio
         * @public
         * @param (String) "fill" or "aspectratio" (default)
         * @param (Object) the Dom-Obj to scale
         * @param (Float) The maximum available width in px
         * @param (Float) The maximum available height in px
         * @param (Float) A forced assumed with of the target object (optional)
         * @param (Float) A forced assumed height of the target object (optional)
         * @return (Boolean) Returns TRUE if <target> was resized in any way, otherwise FALSE
         */
        stretch: function (stretchStyle, target, owid, ohei, twf, thf) {
            var unit = "%",
                wid = owid,
                hei = ohei;

            if (!target) {
                return false;
            }

            if ((target instanceof $) === false) {
                target = $(target);
            }

            if (!target.attr("data-od-width")) {
                target.attr("data-od-width", target.width());
            }
            if (!target.attr("data-od-height")) {
                target.attr("data-od-height", target.height());
            }

            var tw = (twf !== undefined) ? twf : target.attr("data-od-width"),
                th = (thf !== undefined) ? thf : target.attr("data-od-height"),
                xsc = (wid / tw),
                ysc = (hei / th),
                rw = wid,
                rh = hei;

            // fill area
            switch (stretchStyle) {
                case 'none':
                    wid = tw;
                    hei = th;
                    unit = "px";

                    break;

                case 'fill':
                    if (xsc > ysc) {
                        rw = tw * xsc;
                        rh = th * xsc;
                    } else if (xsc < ysc) {
                        rw = tw * ysc;
                        rh = th * ysc;
                    }
                    wid = $p.utils.roundNumber((rw / wid) * 100, 0);
                    hei = $p.utils.roundNumber((rh / hei) * 100, 0);
                    unit = "%";
                    break;

                case 'aspectratio':
                default:
                    // scale, keep aspect ratio
                    if (xsc > ysc) {
                        rw = tw * ysc;
                        rh = th * ysc;
                    } else if (xsc < ysc) {
                        rw = tw * xsc;
                        rh = th * xsc;
                    }
                    wid = $p.utils.roundNumber((rw / wid) * 100, 0);
                    hei = $p.utils.roundNumber((rh / hei) * 100, 0);
                    unit = "%";
                    break;
            }

            if (wid === 0 || hei === 0) {
                return false;
            }

            target.css({
                'margin': 0,
                'padding': 0,
                'width': wid + unit,
                'height': hei + unit,
                'left': (((unit === "%") ? 100 : owid) - wid) / 2 + unit,
                'top': (((unit === "%") ? 100 : ohei) - hei) / 2 + unit
            });

            if (target.attr("data-od-width") != target.width() || target.attr("data-od-height") != target.height()) {
                return true;
            }

            return false;
        },
        // parseUri 1.2.2
        // (c) Steven Levithan <stevenlevithan.com>
        // MIT License
        parseUri: function (str) {
            var o = {
                    strictMode: false,
                    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
                    q: {
                        name: "queryKey",
                        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
                    },
                    parser: {
                        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
                    }
                },
                m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                uri = {},
                i = 14;

            while (i--) {
                uri[o.key[i]] = m[i] || "";
            }

            uri[o.q.name] = {};
            uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
                if ($1) {
                    uri[o.q.name][$1] = $2;
                }
            });

            return uri;
        },
        // usage: log('inside coolFunc',this,arguments);
        // http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
        log: function () {

            if (this.logging === false) {
                return;
            }

            this.history = this.history || []; // store logs to an array for reference
            this.history.push(arguments);
            if (window.console) {
                console.log(Array.prototype.slice.call(arguments));
            }
        },
        cleanResponse: function (responseText, type) {
            var data = false;

            switch (type) {
                case 'html':
                case 'xml':
                    // Create the xml document from the responseText string.
                    data = new DOMParser()
                    data = data.parseFromString(responseText, "text/xml");
                    break;

                case 'json':
                    data = responseText;
                    if (typeof data == 'string') {
                        data = JSON.parse(data);
                    }
                    break;
                default:
                    data = responseText;
                    break;

            }
            return data;
        },
        versionCompare: function (installed, required) {
            var a = installed.split('.'),
                b = required.split('.'),
                i = 0;

            for (i = 0; i < a.length; ++i) {
                a[i] = Number(a[i]);
            }
            for (i = 0; i < b.length; ++i) {
                b[i] = Number(b[i]);
            }
            if (a.length == 2) {
                a[2] = 0;
            }

            if (a[0] > b[0]) {
                return true;
            }
            if (a[0] < b[0]) {
                return false;
            }
            if (a[1] > b[1]) {
                return true;
            }
            if (a[1] < b[1]) {
                return false;
            }
            if (a[2] > b[2]) {
                return true;
            }
            if (a[2] < b[2]) {
                return false;
            }

            return true;
        },
        // detectPlugin function adopted from MediaElement.js
        //
        // get the version number from the mimetype (all but IE) or ActiveX (IE)
        detectPlugin: function (pluginName, mimeType, activeX, axDetect) {

            var nav = window.navigator,
                version = [0, 0, 0],
                description,
                i,
                ax;

            // Firefox, Webkit, Opera
            if (typeof (nav.plugins) != 'undefined' && typeof nav.plugins[pluginName] == 'object') {
                description = nav.plugins[pluginName].description;
                if (description && !(typeof nav.mimeTypes != 'undefined' && nav.mimeTypes[mimeType] && !nav.mimeTypes[mimeType].enabledPlugin)) {
                    version = description.replace(pluginName, '').replace(/^\s+/, '').replace(/\sr/gi, '.').split('.');
                    for (i = 0; i < version.length; i++) {
                        version[i] = parseInt(version[i].match(/\d+/), 10);
                    }
                }
                // Internet Explorer / ActiveX
            } else {
                try {
                    ax = new ActiveXObject(activeX);
                    if (ax) {
                        version = axDetect(ax);
                    }
                } catch (e) {}
            }
            return version;
        },
        /**
         * replaces {}-tags with parameter equivalents
         * @public
         * @param (String) Da string to get processed
         * @param (Object) Object holding data to fill in
         * @return (String) Da parsed string
         */
        parseTemplate: function (template, data, encode) {
            if (data === undefined || data.length == 0 || typeof data != 'object') {
                return template;
            }

            for (var i in data) {
                template = template.replace(new RegExp('%{' + this.regExpEsc(i) + '}', 'gi'), ((encode === true) ? window.encodeURIComponent(data[i]) : data[i]))
            }
            template = template.replace(/%{(.*?)}/gi, '');
            return template;
        },
        i18n: function (str, customData) {
            var regexp = /%{([^}]+)}/g,
                messages = $.extend({}, projekktorMessages, customData),
                text,
                msg = '';

            while (text = regexp.exec(str)) {
                msg = messages.hasOwnProperty(text[1]) ? messages[text[1]] : text[1];
                str = str.replace(new RegExp('%{' + $p.utils.regExpEsc(text[1]) + '}', 'gi'), msg);
            }

            return str;
        },
        errorMessage: function (errorCode, pp) {
            var customData = {
                title: pp.getConfig('title'),
                version: pp.getVersion()
            };

            return this.i18n("%{error" + errorCode + "}", customData);
        },
        regExpEsc: function (s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        },
        parseMimeType: function (mimeType) {
            var type,
                subtype,
                params,
                parameters,
                tokenRegexp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/,
                contentTypeRegex = /^(.*?)\/(.*?)([\t ]*;.*)?$/,
                parameterPattern = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g,
                quotedStringRegexp = /"(?:[\t \x21\x23-\x5B\x5D-\x7E\x80-\xFF]|(?:\\[\t \x21-\x7E\x80-\xFF]))*"/,
                qescRegExp = /\\([\u000b\u0020-\u00ff])/g,
                contentTypeMatch,
                paramMatch,
                key,
                value;

            if (!mimeType) {
                return null;
            }

            contentTypeMatch = contentTypeRegex.exec(mimeType);

            if (contentTypeMatch) {

                type = contentTypeMatch[1];
                subtype = contentTypeMatch[2];
                params = contentTypeMatch[3];

                if (tokenRegexp.test(type) && tokenRegexp.test(subtype)) {

                    parameters = {};

                    while ((paramMatch = parameterPattern.exec(params))) {
                        key = paramMatch[1];
                        value = paramMatch[2];

                        if (quotedStringRegexp.test(value)) {
                            value = value
                                .substr(1, value.length - 2)
                                .replace(qescRegExp, "$1");
                        }

                        if (key) {
                            parameters[key.toLowerCase()] = value;
                        }
                    }
                    return {
                        type: type,
                        subtype: subtype,
                        parameters: parameters
                    }

                }
                return null;
            }
            return null;
        },
        /**
         * serializes a simple object to a JSON formatted string.
         * Note: stringify() is different from jQuery.serialize() which URLEncodes form elements
         * CREDITS: http://blogs.sitepointstatic.com/examples/tech/json-serialization/json-serialization.js
         */
        stringify: function (obj) {
            if ("JSON" in window) {
                return JSON.stringify(obj);
            }

            var t = typeof (obj);
            if (t != "object" || obj === null) {
                // simple data type
                if (t == "string") {
                    obj = '"' + obj + '"';
                }

                return String(obj);
            } else {
                // recourse array or object
                var n, v, json = [],
                    arr = (obj && obj.constructor == Array);

                for (n in obj) {
                    if (obj.hasOwnProperty(n)) {
                        v = obj[n];
                        t = typeof (v);
                        if (obj.hasOwnProperty(n)) {
                            if (t == "string") {
                                v = '"' + v + '"';
                            } else if (t == "object" && v !== null) {
                                v = $p.utils.stringify(v);
                            }

                            json.push((arr ? "" : '"' + n + '":') + String(v));
                        }
                    }
                }

                return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
            }
        },
        /*
         * Check if object has any of given properties/methods
         * and returns the name of first existing one
         * otherwise returns false.
         * If the prefix is set then method will make a second pass
         * to check all of the prefixed versions of given properties/methods
         */
        hasProp: function (obj, prop, prefix, hasOwn) {
            // add prefixed prop version(s)
            if (this.is(prefix, 'string')) {
                prop = this.addPrefix(prop, prefix, false, true);
            }

            if (this.is(prop, 'string')) {
                if (!!(prop in obj) && (!!hasOwn ? obj.hasOwnProperty(prop) : true)) {
                    return prop;
                }
            } else if ($.isArray(prop)) {
                for (var i = 0; i < prop.length; i++) {
                    if (!!(prop[i] in obj) && (!!hasOwn ? obj.hasOwnProperty(prop[i]) : true)) {
                        return prop[i];
                    }
                }
            }
            return false;
        },
        /*
         *
         * @param {string or array} obj - string or array of strings to prefix
         * @param {string} prefix
         * @param (boolean) replace - if the obj is array should the prefixed strings be replaced or added to existing ones
         * @param {boolean} capitalize - should be the first letter of prefixed string capitalized (to preserve camelCase)
         * @returns {string or array} - returns prefixed string or array of strings
         */
        addPrefix: function (obj, prefix, replace, capitalize) {
            if (this.is(obj, 'string') && this.is(prefix, 'string')) {
                if (!!replace) {
                    return prefix + (!!capitalize ? this.ucfirst(obj) : obj);
                } else {
                    return [obj, prefix + (!!capitalize ? this.ucfirst(obj) : obj)];
                }
            } else if ($.isArray(obj) && this.is(prefix, 'string')) {
                var initLength = obj.length;
                for (var i = 0; i < initLength; i++) {
                    if (!!replace) {
                        obj[i] = prefix + (!!capitalize ? this.ucfirst(obj[i]) : obj[i]);
                    } else {
                        obj.push(prefix + (!!capitalize ? this.ucfirst(obj[i]) : obj[i]))
                    }
                }
            }
            return obj;
        },
        /**
         * is returns a boolean for if typeof obj is exactly type.
         * CREDITS: Modernizr
         */
        is: function (obj, type) {
            return typeof obj === type;
        },
        /**
         * contains returns a boolean for if substr is found within str
         * CREDITS: Modernizr
         */
        contains: function (str, substr) {
            return !!~('' + str).indexOf(substr);
        },
        /*
         * Returns a string with the first character of string capitalized
         * @param {string} str
         * @returns {string or boolean}
         */
        ucfirst: function (str) {
            if (this.is(str, 'string')) {
                return str[0].toUpperCase() + str.substr(1);
            }
            return false;
        },
        logging: false
    };

}(window, document, jQuery, projekktor));