/*
 * Projekktor II Plugin: Contextmenu
 *
 * under GNU General Public License
 * http://www.projekktor.com/license/
 */
(function (window, document, $, $p) {
    'use strict';

    if($p === undefined || !$p.hasOwnProperty('plugins')){
        throw new Error('Projekktor player not found. Please initialize Projekktor before adding any plugins.');
    }

    function projekktorRSS() {}

    projekktorRSS.prototype = {

        parserId: 'RSS',
        version: '1.0.2',
        reqVer: '1.8.0',

        initialize: function () {
            this.pluginReady = true;
        },

        scheduleLoadingHandler: function () {
            this.pluginReady = false;
        },

        scheduleLoadedHandler: function (xmlDocument) {
            var node = null;
            try {
                node = $(xmlDocument).find("rss");
                if (node.length > 0) {
                    if (node.attr("version") == 2) {
                        this.pp.addParser(this.parserId, this.parse);
                    }
                }

            } catch (e) {
                console.log(e);
            }
            this.pluginReady = true;
        },

        parse: function (xmlDocument) {
            var result = {};

            result.playlist = [];

            $(xmlDocument).find("item").each(function () {
                try {
                    result['playlist'].push({
                        0: {
                            src: $(this).find('enclosure').attr('url'),
                            type: $(this).find('enclosure').attr('type')
                        },
                        config: {
                            poster: $(this).find('media\\:thumbnail').attr('url'),
                            title: $(this).find('title').text(),
                            desc: $(this).find('description').text()
                        }
                    });
                } catch (e) {}
            });

            return result;
        }
    };

    $p.plugins.projekktorRSS = projekktorRSS;
}(window, document, jQuery, projekktor));