/*
 * Projekktor II Plugin: Contextmenu
 *
 * under GNU General Public License
 * http://www.projekktor.com/license/
 */
var projekktorContextmenu = (function () {

    "use strict";

    function projekktorContextmenu() {}

    projekktorContextmenu.prototype = {

        version: '1.1.2',
        reqVer: '1.7.0',

        _dest: null,
        config: {
            items: {
                playerInfo: {
                    getContextTitle: function (pp) {
                        return pp.getConfig('playerName') + ' V' + pp.getVersion();
                    },
                    open: function(pp) {
                        
                    }
                }
            }
        },

        initialize: function () {

            this._dest = $p.utils.blockSelection(this.applyToPlayer($('<ul/>')));

            this.pluginReady = true;
        },

        mousedownHandler: function (evt) {
            var parentOffset,
                xPos, yPos;

            switch (evt.which) {
                case 3:
                        parentOffset = this.pp.getDC().offset(),
                        yPos = (evt.pageY - parentOffset.top),
                        xPos = (evt.pageX - parentOffset.left);

                    if (xPos + this._dest.width() > this.pp.getDC().width()){
                        xPos = this.pp.getDC().width() - this._dest.width() - 2;
                    }

                    if (yPos + this._dest.height() > this.pp.getDC().height()){
                        yPos = this.pp.getDC().height() - this._dest.height() - 2;
                    }

                    this.setActive();
                    this._dest.css({
                        top: yPos + "px",
                        left: xPos + "px"
                    });
                    break;
                case 1:
                    try {
                        $(evt.target).data('plugin').open(this.pp);
                    } catch (e) {}
                default:
                    this.setInactive();
            }
        },

        mouseleaveHandler: function () {
            this.setInactive();
        },

        eventHandler: function (evt, obj) {
            var items = this.getConfig('items');

            if (evt.indexOf('Contextmenu') > -1) {
                if (items.hasOwnProperty(obj.name)) {
                    items[obj.name] = obj;
                }
            }
        },

        displayReadyHandler: function () {
            var ref = this,
                span = null,
                items = this.getConfig('items');

            this.setInactive();
            this._dest.html('');

            Object.keys(items).forEach(function(itemName){
                var item = items[itemName];

                span = $('<span/>')
                    .data('plugin', item)
                    .html(item.getContextTitle(ref.pp) || item);

                try {
                    item.setContextEntry(span);
                } catch (ignore) { }

                $('<li/>')
                    .append(span)
                    .data('plugin', item)
                    .appendTo(ref._dest);
                });
        },

        popup: function (url, width, height) {
            var centeredY = window.screenY + (((window.outerHeight / 2) - (height / 2))),
            centeredX = window.screenX + (((window.outerWidth / 2) - (width / 2)));
            window.open(url, 'projekktor', 'height=' + height + ',width=' + width + ',toolbar=0,scrollbars=0,status=0,resizable=1,location=0,menuBar=0' + ',left=' + centeredX + ',top=' + centeredY).focus();
        }
    };

    return projekktorContextmenu;
}());