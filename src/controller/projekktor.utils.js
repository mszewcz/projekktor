jQuery(function ($) {

	$p.utils = {

		imageDummy: function () {
			return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABBJREFUeNpi/v//PwNAgAEACQsDAUdpTjcAAAAASUVORK5CYII=';
		},

		/**
		 * Capitalizes a String
		 * @private
		 * @param (Object) da String
		 * @return da result String
		 */
		capitalise: function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
		},

		/**
		 * blocks text selection attempts by the user for the given obj
		 * @private
		 * @param (Object) Object
		 */
		blockSelection: function (dest) {
			if (dest)
				dest
					.css({
						"-khtml-user-select": "none",
						"-webkit-user-select": "none",
						"MozUserSelect": "none",
						"user-select": "none"
					})
					.attr('unselectable', 'on')
					.bind("selectstart", function () {
						return false;
					});
			return dest;
		},

		unique: function (dest) {
			var uniqueArr = [];
			for (var i = dest.length; i--;) {
				var val = dest[i];
				if ($.inArray(val, uniqueArr) === -1) {
					uniqueArr.unshift(val);
				}
			}
			return uniqueArr;
		},

		intersect: function (array1, array2) {

			var result = [];
			$.each(array1, function (i) {
				// ugly try catch mess thx to IE6-8
				try {
					if ($.inArray(array2, array1[i]) > -1) result.push(array1[i]);
				} catch (e) {}
				try {
					if ($.inArray(array1[i], array2) > -1) result.push(array1[i]);
				} catch (e) {}
			});
			return result;
		},

		roundNumber: function (rnum, rlength) {
			if (rnum <= 0 || isNaN(rnum)) return 0;
			return Math.round(rnum * Math.pow(10, rlength)) / Math.pow(10, rlength);
		},

		/* generates a random string of <length> */
		randomId: function (length) {
			var chars = "abcdefghiklmnopqrstuvwxyz",
				result = '';
			for (var i = 0; i < length; i++) {
				var rnum = Math.floor(Math.random() * chars.length);
				result += chars.substring(rnum, rnum + 1);
			}
			return result;
		},

		toAbsoluteURL: function (s) {
			var l = location,
				h, p, f, i;

			if (s == null || s == '') return '';

			if (/^\w+:/.test(s)) {
				return s;
			}

			h = l.protocol + '//' + l.host;
			if (s.indexOf('/')===0) {
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
			if (typeof t != 'string') return t; 
			if (t) {
				var p = t.split(':');
				if (p.length > 3)
					p = p.slice(0, 3);

				for (var i = 0; i < p.length; i++)
					s = s * 60 + parseFloat(p[i].replace(',', '.'));
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

		/* X-Browser flash embedd mess */
		embedFlash: function (destObj, domOptions, shield, shrinkShield) {

			var flashVars = domOptions.FlashVars || {},
				result = '',
				htmlEmbedObj = '',
				htmlEmbed = '',
				tmpStr = '',
				dest = destObj,
				id = '';

			// add flashVars
			if (domOptions.src.indexOf('?') == -1) {
				domOptions.src += "?";
            }
			else {
				domOptions.src += "&";
            }



			for (var key in flashVars) {
				if (typeof flashVars[key] != 'function') {
					tmpStr = flashVars[key];

					/*
			    // support "{tags}" to add media properties
			    for(var i in this.media) {
				if (typeof tmpStr != 'string') continue;	    
				tmpStr = tmpStr.replace('{'+i+'}', this.media[i]);
			    }
			    */
					domOptions.src += key + '=' + encodeURIComponent(tmpStr) + '&';
				}
			}
			domOptions.src.replace(/&$/, '');

			// <object> bullshit with redundant "ID" IE extrawurst
			htmlEmbedObj = '<object id="' + domOptions.id + '" codebase="https://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0"  name="' + domOptions.name + '" width="' + domOptions.width + '" height="' + domOptions.height + '" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000">' + '<param name="movie" value="' + domOptions.src + '"></param>' + '<param name="allowScriptAccess" value="' + domOptions.allowScriptAccess + '"></param>' + '<param name="allowFullScreen" value="' + domOptions.allowFullScreen + '"></param>' + '<param name="wmode" value="' + domOptions.wmode + '"></param>';


			// <embed> tag
			htmlEmbed = '<embed ';
			for (var key in domOptions) {
				if (key.toUpperCase() === 'FLASHVARS') continue;
				if (typeof domOptions[key] != 'function') htmlEmbed += key + '="' + domOptions[key] + '" ';
			}
			htmlEmbed += ' pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash"></embed>';


			result = htmlEmbedObj + htmlEmbed;
			result += '</object>';

			if (!document.all || window.opera) {
				result = htmlEmbed;
			}

			if (dest === null) {
				return result;
            }

			// jquerx 1.4.2 IE flash <object> issue workaround:
			// this does not work in IE: destObj.append(result);
			dest.get(0).innerHTML = result;

			if (shield !== false) {
				dest.append(
					$('<div/>').attr('id', domOptions.id + '_cc')
					.css({
						width: (shrinkShield) ? '1px' : '100%',
						height: (shrinkShield) ? '1px' : '100%',
						backgroundColor: ($p.utils.ieVersion() < 9) ? '#000' : 'transparent',
						filter: 'alpha(opacity = 0.1)',
						position: 'absolute',
						top: 0,
						left: 0
					})
				);
			}

			return $('#' + domOptions.id);
		},
        
		embedPlugin: function (pluginName, destObj, config, shield, shrinkShield) {

			var src = config.src || '',
                attributes = config.attributes || {},
                parameters = config.parameters || {},
                initVars = config.initVars ||  {},
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
                if(attributes.hasOwnProperty(key)){
                    htmlAttributes += key + '="' + attributes[key] + '" ';
                }
            }
            
            // generate <param> elements for <object> embed & attributes for <embed> from parameters
            for (key in parameters) {
                if(parameters.hasOwnProperty(key)){
                    htmlObjectParams += '<param name="' + key + '" value="' + parameters[key] + '" />';
                    htmlEmbedParams += key + '="' + parameters[key] + '" ';
                }
            }
            
            // create array of initVars name=value pairs
            for (key in initVars) {
                if(initVars.hasOwnProperty(key)){
                    initVarsArray.push(key + '=' + encodeURIComponent(initVars[key]));
                }
			}
            
            switch(pluginName) {
                
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
                    
                    result = htmlObject + htmlEmbed;
                    result += '</object>';
                    
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

			

			if (!document.all || window.opera) {
				result = htmlEmbed;
			}

			if (dest === null) {
				return result;
            }

			// jquerx 1.4.2 IE flash <object> issue workaround:
			// this does not work in IE: destObj.append(result);
			dest.get(0).innerHTML = result;

			if (shield !== false) {
				dest.append(
					$('<div/>').attr('id', attributes.id + '_cc')
					.css({
						width: (shrinkShield) ? '1px' : '100%',
						height: (shrinkShield) ? '1px' : '100%',
						backgroundColor: ($p.utils.ieVersion() < 9) ? '#000' : 'transparent',
						filter: 'alpha(opacity = 0.1)',
						position: 'absolute',
						top: 0,
						left: 0
					})
				);
			}

			return $('#' + attributes.id);
		},

		ieVersion: function () {    
			var v = 3,
				div = document.createElement('div'),
				all = div.getElementsByTagName('i');

			while (
				div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
				all[0]
			);

			return v > 4 ? v : undefined;
		},

		/**
		 * replaces {}-tags with parameter equialents
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
		 * stretches target to fit into specified dimensions keeping apsect ratio
		 * @public
		 * @param (String) "fill" or "aspectratio" (default)
		 * @param (Object) the Dom-Obj to scale
		 * @param (Float) The maximum available width in px
		 * @param (Float) The maximum available height in px
		 * @param (Float) A forced asumed with of the target object (optional)
		 * @param (Float) A forced asumed height of the target object (optional)
		 * @return (Boolean) Returns TRUE if <target> was resized in any way, otherwise FALSE
		 */
		stretch: function (stretchStyle, target, owid, ohei, twf, thf) {
			var unti = "%",
				wid = owid,
				hei = ohei;
				
			if (target == null)
				return false;

			if ((target instanceof $)===false) {
				target = $(target);
			}

            if (!target.attr("data-od-width")) target.attr("data-od-width",  target.width());
			if (!target.attr("data-od-height")) target.attr("data-od-height", target.height());
				
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

			if (wid===0 || hei===0) {
				return false;
			}

			target.css({
				'margin': 0,
				'padding': 0,
				'width': wid + unit,
				'height': hei + unit,
				'left': ( ((unit=="%") ? 100 : owid) - wid) / 2 + unit,
				'top': ( ((unit=="%") ? 100 : ohei) - hei) / 2 + unit
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

			while (i--) uri[o.key[i]] = m[i] || "";

			uri[o.q.name] = {};
			uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
				if ($1) uri[o.q.name][$1] = $2;
			});

			return uri;
		},

		// usage: log('inside coolFunc',this,arguments);
		// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/                
		log: function () {

			if (this.logging===false) {
				return;
			}

			this.history = this.history || []; // store logs to an array for reference
			this.history.push(arguments);
			if (window.console)
				console.log(Array.prototype.slice.call(arguments));
		},

		cleanResponse: function (responseText, type) {
			var data = false;

			switch (type) {
			case 'html':
			case 'xml':
				// Create the xml document from the responseText string.
				if (window.DOMParser) {
					data = new DOMParser()
					data = data.parseFromString(responseText, "text/xml");
				} else { // Internet Explorer
					data = new ActiveXObject("Microsoft.XMLDOM");
					data.async = "false";
					data.loadXML(responseText);
				}
				break;

			case 'json':
				data = responseText;
				if (typeof data == 'string') {
					data = $.parseJSON(data);
				}
				break;
			case 'jsonp':
				break;
			default:
				data = responseText;
				break;

			}
			return data;
		},

		cssTransitions: function () {
			var m = document.createElement('z'),
				s = m.style;

			function test_props(p) {
				for (var i in p) {
					if (s[p[i]] != null) {
						return true;
					}
				}
				return false;
			}

			function test_props_all(prop) {
				var d = 'Webkit Moz O ms Khtml'.split(' '),
					u = prop.charAt(0).toUpperCase() + prop.substr(1),
					e = (prop + ' ' + d.join(u + ' ') + u).split(' ');
				return test_props(e);
			}
			return test_props_all('animationName');
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
    
            if (a[0] > b[0]) return true;
            if (a[0] < b[0]) return false;
    
            if (a[1] > b[1]) return true;
            if (a[1] < b[1]) return false;
    
            if (a[2] > b[2]) return true;
            if (a[2] < b[2]) return false;
    
            return true;
        },
        
        // detectPlugin function adopted from MediaElement.js
        // 
        // get the version number from the mimetype (all but IE) or ActiveX (IE)
        detectPlugin: function(pluginName, mimeType, activeX, axDetect) {

            var nav = window.navigator,
                version = [0,0,0],
                description,
                i,
                ax;

            // Firefox, Webkit, Opera
            if (typeof(nav.plugins) != 'undefined' && typeof nav.plugins[pluginName] == 'object') {
                description = nav.plugins[pluginName].description;
                if (description && !(typeof nav.mimeTypes != 'undefined' && nav.mimeTypes[mimeType] && !nav.mimeTypes[mimeType].enabledPlugin)) {
                    version = description.replace(pluginName, '').replace(/^\s+/,'').replace(/\sr/gi,'.').split('.');
                    for (i=0; i<version.length; i++) {
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
                }
                catch (e) { }
            }
            return version;
        },

		/**
		* replaces {}-tags with parameter equialents
		* @public
		* @param (String) Da string to get processed
		* @param (Object) Object holding data to fill in
		* @return (String) Da parsed string
		*/
		parseTemplate: function (template, data, encode) {
			if (data === undefined || data.length == 0 || typeof data != 'object') return template;
			
			for (var i in data) {
				template = template.replace(new RegExp('%{' + this.regExpEsc(i) + '}', 'gi'), ((encode === true) ? window.encodeURIComponent(data[i]) : data[i]))
			}
			template = template.replace(/%{(.*?)}/gi, '');
			return template;
		},

		
        /**
         * serializes a simple object to a JSON formatted string.
         * Note: stringify() is different from jQuery.serialize() which URLEncodes form elements
         * CREDITS: http://blogs.sitepointstatic.com/examples/tech/json-serialization/json-serialization.js
         */        
        stringify: function(obj) {         
            if ("JSON" in window) {
                return JSON.stringify(obj);
            }
    
            var t = typeof (obj);
            if (t != "object" || obj === null) {
                // simple data type
                if (t == "string") obj = '"' + obj + '"';
    
                return String(obj);
            } else {
                // recurse array or object
                var n, v, json = [], arr = (obj && obj.constructor == Array);
    
                for (n in obj) {
					if (obj.hasOwnProperty(n)) {
						v = obj[n];
						t = typeof(v);
						if (obj.hasOwnProperty(n)) {
							if (t == "string") {
								v = '"' + v + '"';
							} else if (t == "object" && v !== null){
								v = $p.utils.stringify(v);
							}
		
							json.push((arr ? "" : '"' + n + '":') + String(v));
						}
					}
                }
    
                return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
            }
        },
        
        regExpEsc: function(s){
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        },
        
		logging: false
	};
});


jQuery(function ($) {

	$p.platforms = {

        VLC: function() {
            // we are interested in VLC Web Plugin v2
            var result = $p.utils.detectPlugin('"VLC Web Plugin"', 'application/x-vlc-plugin', 'VideoLAN.VLCPlugin.2', function(ax) {
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
			var result = $p.utils.detectPlugin('Shockwave Flash','application/x-shockwave-flash','ShockwaveFlash.ShockwaveFlash', function(ax) {
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
        
        SILVERLIGHT: function() {
            var result = $p.utils.detectPlugin('Silverlight Plug-In','application/x-silverlight-2','AgControl.AgControl', function (ax) {
                // Silverlight cannot report its version number to IE
                // but it does have a isVersionSupported function, so we have to loop through it to get a version number.
                // adapted from http://www.silverlightversion.com/
                var v = [0,0,0,0],
                    loopMatch = function(ax, v, i, n) {
                        while(ax.isVersionSupported(v[0]+ "."+ v[1] + "." + v[2] + "." + v[3])){
                            v[i]+=n;
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
			} catch (e) {}
            return "0";
		},

		IOS: function () {
			var agent = navigator.userAgent.toLowerCase(),
				start = agent.indexOf('os ');
			if ((agent.indexOf('iphone') > -1 || agent.indexOf('ipad') > -1) && start > -1) {
				return (agent.substr(start + 3, 3).replace('_', '.')).toString()
			}
			return "0";
		},

		NATIVE: function (type) {
			try {
				var testObject = $((type.indexOf('video')>-1) ? '<video/>' : '<audio/>').get(0);
				if (testObject.canPlayType!=null) {
					if (type==='*') {
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
			} catch (e) {}
            return "0";
		},

		BROWSER: function () {
			return "1";
		}
	};
});
