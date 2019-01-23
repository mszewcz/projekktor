/*
 * this file is part of
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010-2014, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * Copyright 2015-2017 - Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net
 *
 * under GNU General Public License
 * http://www.projekktor.com/license/
 */

window.projekktor = window.$p = (function (window, document, $) {

    "use strict";

    var projekktors = [];

    // this object is returned in case multiple player's are requested
    function Iterator(arr) {
        this.length = arr.length;
        this.each = function (fn) {
            $.each(arr, fn);
        };
        this.size = function () {
            return arr.length;
        };
    }


    function PPlayer(srcNode, cfg, onReady) {
        this.config = new projekktorConfig();

        this.storage = new projekktorPersistentStorage(this);

        this.env = {
            muted: false,
            volume: 1,
            playerDom: null,
            mediaContainer: null,
            mouseIsOver: false,
            loading: false, // important
            className: '',
            onReady: onReady
        };

        this.media = [];
        this._plugins = [];
        this._pluginCache = {};
        this._queue = [];
        this._cuePoints = {};
        this.listeners = [];
        this.playerModel = {};
        this._isReady = false;
        this._isLive = false;
        this._isFullViewport = false;
        this._maxElapsed = 0;
        this._playlistServer = '';
        this._id = '';
        this._parsers = {};

        this.itemRules = [
            function () {
                return arguments[0].id != null;
            },
            function () {
                return arguments[0].config.active !== false;
            },
            function () {
                return arguments[0].config.maxviews == null || arguments[0].viewcount < arguments[0].config.maxviews;
            }
        ];

        /**
         * Add items to the playlist on provided index
         *
         * @param {array} items - playlist items to add
         * @param {number} [index=this.media.length] - index on which the items should be added
         * @param {boolean} [replace=false] - should the items on specified index be replaced
         * @returns {object} object with affected index, added and replaced (removed) items.
         * For example when nothing was added the object will look like: {added: [], removed: [], index: -1}
         */
        this.addItems = function (items, index, replace) {

            var result = {
                    added: [],
                    removed: [],
                    indexes: [],
                    currentItemAffected: false
                },
                i, l,
                item,
                files,
                itemIds = [],
                currentItem = this.getItem();

            replace = !!replace || false; // default is false

            // constrain index to the range
            index = (typeof index !== 'number') ? this.media.length : index;
            index = (index > this.media.length) ? this.media.length : index;
            index = (index < 0) ? 0 : index;

            // check if there is data to add
            if ($.isEmptyObject(items)) {
                return result;
            }

            // check if items are not the reference to the actual media array (for example when result of getPlaylist() is passed)
            if (items === this.media) {
                items = items.slice(); // clone
            }

            // check if items is an array and if it's not push it to the array
            if (!$.isArray(items)) {
                items = [items];
            }

            // be sure that items are unique and processed
            for (i = 0, l = items.length; i < l; i++) {

                item = items[i];
                files = [];

                $.each(item, function (key, value) {
                    if ($.isNumeric(key)) {
                        files.push(value);
                    }
                });

                // item is not processed by _prepareMedia yet
                if (item.processed !== true) {
                    item = this._processItem({
                        file: files,
                        config: item.config || {}
                    });
                }

                // check if the id is unique in currently added array
                if ($.inArray(item.id, itemIds) > -1) {
                    item.id = item.id + '_' + $p.utils.randomId(8);
                }

                // item is already on the playlist, so provide an unique copy of it
                if (this.getItemById(item.id)) {
                    item = $.extend(true, {}, item);
                    item.id = $p.utils.randomId(8);
                }

                // set cuepoints if there are some
                if (item.hasOwnProperty('cuepoints') && !!item.cuepoints) {
                    this.setCuePoints(item.cuepoints, item.id, true);
                }

                itemIds.push(item.id);
                items[i] = item;
            }

            // add item
            result.added = items;
            result.removed = Array.prototype.splice.apply(this.media, [index,
                (replace === true ? items.length : 0)
            ].concat(items));
            result.indexes = [index];
            result.currentItemAffected = $.inArray(currentItem, result.removed) > -1;

            this._promote('scheduleModified', result);

            return result;
        };

        /**
         * Shortcut function to remove item from playlist at given index
         *
         * @param {number} [index=this.media.length-1] - index of item to remove. Default is the last one on the playlist.
         * @returns {object} - object with affected index, removed item  e.g.: {added: [], removed: [], index: -1}
         */
        this.removeItemAtIndex = function (index) {

            var result = {
                    added: [],
                    removed: [],
                    indexes: [],
                    currentItemAffected: false
                },
                func = function (itm, idx) {
                    return idx === index;
                };

            // check if we could remove something
            if (typeof index !== 'number' ||
                this.media.length === 0 ||
                index > this.media.length - 1 ||
                index < 0) {
                return result;
            }

            // remove item
            result = this.removeItems(func);

            return result;
        };

        /**
         * Shortcut function to remove item by id
         * @param {string} itemId
         * @returns {object}
         */
        this.removeItemById = function (itemId) {
            var result = {
                    added: [],
                    removed: [],
                    indexes: [],
                    currentItemAffected: false
                },
                func = function (itm, idx) {
                    return itm.id === itemId;
                };

            // check if we could remove something
            if (typeof itemId !== 'string' ||
                this.media.length === 0) {
                return result;
            }

            result = this.removeItems(func);

            return result;
        };

        this.removeItemsCategory = function (catName) {
            var result = {
                    added: [],
                    removed: [],
                    indexes: [],
                    currentItemAffected: false
                },
                func = function (itm, idx) {
                    return itm.cat === catName;
                };

            // check if we could remove something
            if (typeof catName !== 'string' ||
                this.media.length === 0) {
                return result;
            }

            result = this.removeItems(func);

            return result;
        };

        /**
         * Remove playlist items which satisfy a filter function. If no function provided then all items are removed
         * @param {function} [which] - function( Object elementOfArray, Integer indexInArray ) => Boolean;
         * The function to process each playlist item against. The first argument to the function is the item,
         * and the second argument is the index. The function should return a Boolean value.
         * @returns {object} - object with affected index, removed item  e.g.: {added: [], removed: [], index: -1}
         */
        this.removeItems = function (which) {

            var result = {
                    added: [], // just for consistency with addItems()
                    removed: [],
                    indexes: [],
                    currentItemAffected: false
                },
                currentItem = this.getItem(),
                toRemove,
                toRemoveIndexes = [],
                i, l;

            if (typeof which === 'undefined') {
                which = function (itm, idx) {
                    return true;
                };
            } else if (!$.isFunction(which)) {
                return result;
            }

            // check if there anything to remove
            if (this.media.length === 0) {
                return result;
            }

            toRemove = $.grep(this.media, which);

            for (i = 0, l = toRemove.length; i < l; i++) {
                toRemoveIndexes.push($.inArray(toRemove[i], this.media));
            }

            for (i = 0, l = toRemoveIndexes.length; i < l; i++) {
                result.removed.push(this.media.splice(toRemoveIndexes[i] - i, 1)[0]);
            }

            result.indexes = toRemoveIndexes;
            result.currentItemAffected = $.inArray(currentItem, result.removed) > -1;

            this._promote('scheduleModified', result);

            return result;
        };

        this.getItemById = function (itemId) {
            return this.media.find(function (item) {
                return (itemId === item.id);
            }) || null;
        };

        this.getItemsByCatName = function (catName) {
            return this.media.filter(function (item) {
                return (catName === item.cat);
            }) || [];
        };

        /**
         * Returns all possible platform names implemented in projekktor which are potentially 
         * able to play the MIME Type specified in the argument. 
         */
        this._canPlayOnPlatforms = function (mimeType) {
            var platformsSet = new Set(),
                mILove = $p.cache.modelsILove || [];

            mILove.forEach(function (iLove) {
                if (iLove.type === mimeType) {
                    iLove.platform.forEach(function (platform) {
                        platformsSet.add(platform);
                    });
                }
            });

            return platformsSet;
        };

        /**
         * Checks if mimeType can be played using specified platform
         */
        this._canPlay = function (mimeType, platform) {

            var platformMimeTypeMap = this.getSupportedPlatforms(),
                pt = (typeof platform === "string") ? platform.toLowerCase() : "browser",
                type = (typeof mimeType === "string") ? mimeType.toLowerCase() : undefined;

            // if mimeType is undefined we have nothing to look for
            if (type === undefined) {
                return false;
            }

            // platform unsupported
            if (!platformMimeTypeMap.has(pt)) {
                return false;
            }

            // everything fine
            // check if specified platform is supporting mimeType we are looking for
            return platformMimeTypeMap.get(pt).has(type);
        };

        this._processItem = function (itemData) {
            var files = itemData.file || [],
                config = itemData.config || {},
                defaultItem = {
                    id: config.id || $p.utils.randomId(8),
                    cat: config.cat || 'clip',
                    file: [],
                    availableFiles: files,
                    platform: 'browser',
                    qualities: [], // available quality keys
                    model: 'NA',
                    errorCode: undefined,
                    viewcount: 0,
                    processed: false,
                    config: config,
                    cuepoints: []
                },
                resultItem = $.extend({}, defaultItem);

            // leave only supported files
            resultItem = this._filterSupportedItemFiles(resultItem);

            if (resultItem.file.length) {
                // In this place we are dealing only with potentially playable files.
                // Now we need to select the best one(s) to play.
                resultItem = this._getBestModelForItem(resultItem);

                // leave only valid files for the selected model/platform
                resultItem = this._filterFiles(resultItem, function (file, idx, files) {
                    return file.type === files[0].type;
                });

                // finally check for available qualities and remove redundant file formats
                resultItem = this._filterQualities(resultItem);
            }

            resultItem.processed = true;

            return resultItem;
        };

        this._processItemFile = function (file) {
            var parsedMimeType,
                resultFile = {
                    src: $p.utils.toAbsoluteURL(file.src),
                    type: 'none/none',
                    originalType: file.type,
                    drm: file.drm || [],
                    codecs: undefined,
                    quality: file.quality || 'auto'
                };

            // check and cleanup provided mimeType
            if (file.type) {
                parsedMimeType = $p.utils.parseMimeType(file.type);
                resultFile.type = parsedMimeType.type + "/" + parsedMimeType.subtype;
                resultFile.codecs = parsedMimeType.parameters.codecs;
            }
            // if type is not set try to get it from file extension
            else {
                resultFile.type = ref._getTypeFromFileExtension(file.src);
            }

            return resultFile;
        };

        this._filterSupportedItemFiles = function (item) {

            var ref = this,
                inFiles = item.availableFiles || [],
                outFiles = [];

            // select only playable files
            inFiles.forEach(function (file) {
                var processedFile = ref._processItemFile(file),
                    mimeType = processedFile.type,
                    drm = processedFile.drm;

                // check if the format is supported
                if (ref.getCanPlay(mimeType)) {
                    // check if there is any DRM system specified 
                    if (drm.length) {
                        // if it is then check if it's supported
                        if (drm.some(function (drmSystem) {
                                return ref.getCanPlayWithDrm(drmSystem, mimeType);
                            })) {
                            // if so add this file to the list
                            outFiles.push(processedFile);
                        }
                        // if it's not then add appropriate error code
                        else {
                            item.errorCode = 300;
                        }
                    }
                    // if it's not then just add the file to the list
                    else {
                        outFiles.push(processedFile);
                    }
                }
                // add error code for unsupported file format
                else {
                    item.errorCode = 5;
                }
            });

            // cleanup errorCode if there are some playable files
            if (outFiles.length) {
                item.errorCode = undefined;
            }

            item.file = outFiles;

            return item;
        };

        this._getBestModelForItem = function (item) {
            var ref = this,
                files = item.file,
                config = item.config || {},
                prioritizeBy = config.prioritizeBy || this.getConfig('prioritizeBy'),
                platformPriorities = Array.from(this.getSupportedPlatforms().keys()),
                resultILoves = [],
                file,
                selectedModel = item.model,
                selectedPlatform = item.platform;

            // select best model based on defined priorities
            if (prioritizeBy === 'sourcesOrder') {
                // in 'sourcesOrder' mode we just need to find a proper model
                // for the first playable file
                file = files[0];
            } else {
                /**
                 * In platformsOrder mode we need to find the first file supported by the 
                 * platform with highest priority.
                 */
                platformPriorities.some(function (pt) {
                    selectedPlatform = pt;
                    file = files.find(function (f) {
                        if (f.drm.length) {
                            return f.drm.some(function (drmSystem) {
                                return ref.getCanPlayWithDrm(drmSystem, f.type, [pt]);
                            });
                        } else {
                            return ref.getCanPlay(f.type, [pt]);
                        }
                    });
                    return file !== undefined;
                });
            }

            /**
             * Get only sensible iLoves in this context
             */
            resultILoves = this._filterModelILoves(file.type, file.drm);

            /**
             * Now resultILoves is filled only with compatible and supported models iLoves
             * but probably in the wrong order. Select first one with the highest priority
             * for supported platforms.
             */

            platformPriorities.some(function (pt) {
                selectedPlatform = pt;
                selectedModel = resultILoves.find(function (iLove) {
                    return (iLove.platform.indexOf(pt) > -1);
                });

                return selectedModel !== undefined;
            });

            // move selected file to the beginning of the array
            item.file = files.splice(files.indexOf(file), 1).concat(files);
            item.model = selectedModel.model;
            item.platform = selectedPlatform;

            return item;
        };

        this._filterModelILoves = function (mimeType, drmSystems) {
            var modelsILoveSupported = $p.cache.modelsILoveSupported,
                drm = drmSystems || [];

            return modelsILoveSupported.filter(function (iLove) {
                return (iLove.type === mimeType &&
                    (!drm.length // no DRM support needed
                        // DRM support needed
                        ||
                        (iLove.drm // model has defined DRM support
                            &&
                            $p.utils.intersect(iLove.drm, drm).length // and this is the DRM support we need
                        )
                    )
                );
            });
        };

        this._filterQualities = function (item) {
            var inFiles = item.file,
                qualityDefinitions = item.config.playbackQualities || this.getConfig('playbackQualities') || [],
                fileQualityKeys = [],
                definedQualityKeys = qualityDefinitions.map(function (q) {
                    return q.key;
                }),
                outFiles = [];

            // always push 'auto' to the definedQualityKeys
            definedQualityKeys.push('auto');

            // collect all quality keys from available files
            inFiles.forEach(function (file) {
                fileQualityKeys.push(file.quality);
            });

            // leave only unique ones
            fileQualityKeys = $p.utils.unique(fileQualityKeys);

            // are there proper definitions for those quality keys?
            // leave only valid ones
            fileQualityKeys = $p.utils.intersect(fileQualityKeys, definedQualityKeys);

            // is there more than one quality
            if (fileQualityKeys.length > 1) {
                // leave only one file for each valid key
                fileQualityKeys.forEach(function (qKey) {
                    outFiles.push(inFiles.find(function (file) {
                        return file.quality === qKey;
                    }));
                });
            }

            // if there is no usable quality file
            // add first file from playable ones and overwrite its quality with 'auto'
            if (outFiles.length === 0) {
                inFiles[0].quality = 'auto';
                outFiles.push(inFiles[0]);
            }

            item.file = outFiles;
            item.qualities = fileQualityKeys;

            return item;
        };

        this._filterFiles = function (item, filterFunc) {
            var files = item.file || [];

            item.file = files.filter(filterFunc);

            return item;
        };

        /********************************************************************************************
         Event Handlers:
         *********************************************************************************************/

        /* Event Handlers */

        this.displayReadyHandler = function () {

            this._syncPlugins('displayready');
        };

        this.modelReadyHandler = function () {

            this._maxElapsed = 0;
            this._promote('item', this.getItemIdx());
        };

        this.pluginsReadyHandler = function (obj) {

            switch (obj.callee) {
                case 'parserscollected':
                    var parser = this.getParser(obj.data[2]);
                    this.setPlaylist(parser(obj.data));
                    if (this.getItemCount() < 1) {
                        this.setPlaylist();
                    }
                    break;

                case 'reelupdate':
                    this._promote('playlistLoaded', this.getPlaylist());
                    this.setActiveItem(0);
                    break;

                case 'displayready':
                    this._addGUIListeners();
                    this._promote('synchronized');
                    if (this.getState('AWAKENING')) {
                        this.playerModel.start();
                    }
                    if (!this._isReady) {
                        this._promote('ready');
                    }
                    break;

                case 'awakening':
                    if (this.getState('AWAKENING')) {
                        this.playerModel.displayItem(true);
                    }
                    break;
            }
        };

        this.synchronizedHandler = function (forceAutoplay) {

            if (this._isReady) {

                if (this.playerModel.init && (this.playerModel._ap === true || forceAutoplay === true) && this.getState('IDLE')) {
                    this.setPlay();
                }
            }
        };

        this.scheduleModifiedHandler = function (event) {
            if (event.currentItemAffected) {
                this.setActiveItem('next');
            }
        };

        this.readyHandler = function () {

            this._isReady = true;

            if (typeof onReady === 'function') {
                onReady(this);
            }

            this.synchronizedHandler(this.getConfig('autoplay'));
        };

        this.stateHandler = function (stateValue) {

            var ref = this;

            // change player css classes in order to reflect current state:
            var classes = $.map(this.getDC().attr("class").split(" "), function (item) {
                return item.indexOf(ref.getConfig('ns') + "state") === -1 ? item : null;
            });

            classes.push(this.getConfig('ns') + "state" + stateValue.toLowerCase());
            this.getDC().attr("class", classes.join(" "));

            switch (stateValue) {
                case 'STARTING':
                    this.getItem().viewcount++;
                    break;

                case 'AWAKENING':
                    this._syncPlugins('awakening');
                    break;

                case 'ERROR':
                    this._addGUIListeners();
                    if (this.getConfig('skipTestcard')) {
                        this.setActiveItem('next');
                    }
                    break;

                case 'COMPLETED':
                    this.setActiveItem('next');
                    break;

                case 'IDLE':
                    if (this.getConfig('leaveFullscreen')) {
                        this.setFullscreen(false);
                    }
                    break;
            }
        };

        this.volumeHandler = function (value) {
            var muted;

            if (value <= 0) {
                muted = true;
            } else {
                muted = false;
            }

            if (muted !== this.env.muted) {
                this.env.muted = muted;
                this.storage.save('muted', muted);
                this._promote('muted', muted);
            }

            this.storage.save('volume', value);
            this.env.volume = value;
        };

        this.playlistHandler = function (value) {
            this.setFile(value.file, value.type);
        };

        this.cuepointsAddHandler = function (value) {
            this._cuepointsChangeEventHandler(value);
        };

        this.cuepointsRemoveHandler = function (value) {
            this._cuepointsChangeEventHandler(value);
        };

        this.fullscreenHandler = function (goFullscreen) {

            if (goFullscreen === true) {
                this._requestFullscreen();
                this.getDC().addClass(this.getNS() + 'fullscreen');
            } else {
                this._exitFullscreen();
                this.getDC().removeClass(this.getNS() + 'fullscreen');
            }
        };

        this.configHandler = function (value) {
            this.setConfig(value);
        };

        this.timeHandler = function (value) {

            if (this._maxElapsed < value) {

                var pct = Math.round(value * 100 / this.getDuration()),
                    evt = false;

                if (pct < 25) {
                    pct = 25;
                }
                if (pct > 25 && pct < 50) {
                    evt = 'firstquartile';
                    pct = 50;
                }
                if (pct > 50 && pct < 75) {
                    evt = 'midpoint';
                    pct = 75;
                }
                if (pct > 75 && pct < 100) {
                    evt = 'thirdquartile';
                    pct = 100;
                }

                if (evt !== false) {
                    this._promote(evt, value);
                }

                this._maxElapsed = (this.getDuration() * pct / 100);
            }
        };

        this.availableQualitiesChangeHandler = function (value) {

            this.getItem().qualities = value;
        };

        this.qualityChangeHandler = function (value) {

            this.setConfig({
                playbackQuality: value
            });
        };

        this.streamTypeChangeHandler = function (value) {

            if (value === 'dvr' || value === 'live') {
                this._isLive = true;
            } else {
                this._isLive = false;
            }

            switch (value) {
                case 'dvr':
                    this.getDC().addClass(this.getNS() + 'dvr');
                    this.getDC().addClass(this.getNS() + 'live');
                    break;
                case 'live':
                    this.getDC().removeClass(this.getNS() + 'dvr');
                    this.getDC().addClass(this.getNS() + 'live');
                    break;
                default:
                    this.getDC().removeClass(this.getNS() + 'dvr');
                    this.getDC().removeClass(this.getNS() + 'live');
                    break;
            }
        };

        this.doneHandler = function () {

            this.setActiveItem(0, false);

            // prevent player-hangup in situations where
            // playlist becomes virtually empty by applied filter rules (e.g. maxviews)
            if (!this.getNextItem()) {
                //this.reset();
            }
        };

        this._syncPlugins = function (callee, data) {

            // wait for all plugins to re-initialize properly
            var ref = this,
                sync = function () {
                    try {
                        if (ref._plugins.length > 0) {
                            for (var i = 0; i < ref._plugins.length; i++) {
                                if (!ref._plugins[i].isReady()) {
                                    setTimeout(sync, 50);
                                    return;
                                }
                            }
                        }
                        ref._promote('pluginsReady', {
                            callee: callee,
                            data: data
                        });
                    } catch (e) {}
                };

            setTimeout(sync, 50);
        };

        /* attach mouse-listeners to GUI elements */
        this._addGUIListeners = function () {

            var ref = this;

            this._removeGUIListeners();

            this.getDC().on("mousedown mousemove mouseenter mouseleave focus blur", function handler(e) {
                ref._playerFocusListener(e);
            });

            $(window)
                .on('resize.projekktor' + this.getId(), function () {
                    ref.setSize();
                })
                .on('touchstart.projekktor' + this.getId(), function (event) {
                    ref._windowTouchListener(event);
                });

            if (this.config.enableKeyboard === true) {
                $(document).off('keydown.pp' + this._id);
                $(document).on('keydown.pp' + this._id, function (evt) {
                    ref._keyListener(evt);
                });
            }
        };

        /* remove mouse-listeners */
        this._removeGUIListeners = function () {

            $("#" + this.getId()).off();
            this.getDC().off();


            $(window).off('touchstart.projekktor' + this.getId());
            $(window).off('resize.projekktor' + this.getId());
        };

        /* add plugin objects to the bubble-event queue */
        this._registerPlugins = function () {

            var plugins = $.merge($.merge([], this.config._plugins), this.config._addplugins),
                pluginName = '',
                pluginNamePrefix = 'projekktor',
                pluginObj = null,
                availablePlugins = $p.plugins,
                i;

            // nothing to do
            if (this._plugins.length > 0 || plugins.length === 0) {
                return;
            }

            for (i = 0; i < plugins.length; i++) {
                pluginName = pluginNamePrefix + plugins[i].charAt(0).toUpperCase() + plugins[i].slice(1);

                if (typeof availablePlugins[pluginName] !== 'function') {
                    $p.utils.log("Projekktor Error: Plugin '" + plugins[i] + "' malicious or not available.");
                    continue;
                }

                pluginObj = $.extend(true, {}, new projekktorPluginInterface(), availablePlugins[pluginName].prototype);
                pluginObj.name = plugins[i].toLowerCase();
                pluginObj.pp = this;
                pluginObj.playerDom = this.env.playerDom;
                pluginObj._init(this.config['plugin_' + plugins[i].toLowerCase()] || {});

                if (this.config['plugin_' + pluginObj.name] == null) {
                    this.config['plugin_' + pluginObj.name] = {};
                }

                this.config['plugin_' + pluginObj.name] = $.extend(true, {}, pluginObj.config || {});

                for (var propName in pluginObj) {

                    if (propName.indexOf('Handler') > 1) {

                        if (!this._pluginCache.hasOwnProperty(propName)) {
                            this._pluginCache[propName] = [];
                        }
                        this._pluginCache[propName].push(pluginObj);
                    }
                }

                this._plugins.push(pluginObj);
            }
        };

        /* removes some or all eventlisteners from registered plugins */
        this.removePlugins = function (rmvPl) {

            if (this._plugins.length === 0) {
                return;
            }

            var pluginsToRemove = rmvPl || $.merge($.merge([], this.config._plugins), this.config._addplugins),
                pluginsRegistered = this._plugins.length;

            for (var j = 0; j < pluginsToRemove.length; j++) {

                for (var k = 0; k < pluginsRegistered; k++) {

                    if (this._plugins[k] !== undefined) {

                        if (this._plugins[k].name === pluginsToRemove[j].toLowerCase()) {
                            this._plugins[k].deconstruct();
                            this._plugins.splice(k, 1);

                            for (var events in this._pluginCache) {

                                if (this._pluginCache.hasOwnProperty(event)) {

                                    for (var shortcuts = 0; shortcuts < this._pluginCache[events].length; shortcuts++) {

                                        if (this._pluginCache[events][shortcuts].name === pluginsToRemove[j].toLowerCase()) {
                                            this._pluginCache[events].splice(shortcuts, 1);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        this.getPlugins = function () {

            var result = [];

            $.each(this._plugins, function () {
                result.push({
                    name: this.name,
                    ver: this.version || 'unknown'
                });
            });

            return result;
        };

        /* media element update listener */
        this._modelUpdateListener = function (evtName, value) {

            if (this.playerModel.init) {
                this._promote(evtName, value);
            }
        };

        this._promote = function (evt, value) {
            var ref = this;
            this._enqueue(function () {
                try {
                    ref.__promote(evt, value);
                } catch (e) {}
            });
        };

        /* promote an event to all registered plugins */
        this.__promote = function (evt, value) {

            var ref = this,
                event = evt,
                pluginEventHandlersCache = this._pluginCache,
                playerListeners = this.listeners || [],
                pluginsWithHandlers;

            if (typeof event === 'object') {

                if (!event._plugin) {
                    return;
                }
                event = 'plugin_' + event._plugin + $p.utils.ucfirst(event._event.toLowerCase());
            }

            if (event !== 'time' && event !== 'progress' && event !== 'mousemove') {
                $p.utils.log('Event: [' + event + ']', value, playerListeners);
            }

            // fire on plugins
            pluginsWithHandlers = pluginEventHandlersCache[event + 'Handler'] || [];
            pluginsWithHandlers.forEach(function (plugin) {
                try {
                    plugin[event + 'Handler'](value, ref);
                } catch (error) {
                    $p.utils.log(error);
                }
            });

            // universal plugin event handler
            pluginsWithHandlers = pluginEventHandlersCache['eventHandler'] || [];
            pluginsWithHandlers.forEach(function (plugin) {
                try {
                    plugin['eventHandler'](event, value, ref);
                } catch (error) {
                    $p.utils.log(error);
                }
            });

            // fire on custom player listeners
            playerListeners.forEach(function (listener) {
                if (listener.event === event || listener.event === '*') {
                    try {
                        listener.callback(value, ref);
                    } catch (error) {
                        $p.utils.log(error);
                    }
                }
            });

            // fire on self:
            if (ref.hasOwnProperty(event + 'Handler')) {
                try {
                    ref[evt + 'Handler'](value);
                } catch (error) {
                    $p.utils.log(error);
                }
            }
        };

        /* destroy, reset, break down to rebuild */
        this._detachplayerModel = function () {

            this._removeGUIListeners();
            try {
                this.playerModel.destroy();
                this._promote('detach', {});
            } catch (e) {
                // this.playerModel = new playerModel();
                // this.playerModel._init({pp:this, autoplay: false});
            }
        };


        /*******************************
         GUI LISTENERS
         *******************************/
        this._windowTouchListener = function (evt) {

            if (evt.touches) {

                if (evt.touches.length > 0) {
                    if (($(document.elementFromPoint(evt.touches[0].clientX, evt.touches[0].clientY))
                            .attr('id') || '').indexOf(this.getDC().attr('id')) > -1) {

                        if (this.env.mouseIsOver === false) {
                            this._promote('mouseenter', {});
                        }

                        this.env.mouseIsOver = true;

                        this._promote('mousemove', {});
                        evt.stopPropagation();
                    } else if (this.env.mouseIsOver) {
                        this._promote('mouseleave', {});
                        this.env.mouseIsOver = false;
                    }
                }
            }
        };

        this._playerFocusListener = function (evt) {

            var type = evt.type.toLowerCase();

            switch (type) {
                case 'mousedown':

                    if (this.env.mouseIsOver === false) {
                        break;
                    }

                    // make sure we do not mess with input-overlays here:
                    if ("|TEXTAREA|INPUT".indexOf('|' + evt.target.tagName.toUpperCase()) > -1) {
                        return;
                    }

                    // prevent context-menu
                    if (evt.which === 3) {

                        if ($(evt.target).hasClass('context')) {
                            break;
                        }
                        $(document).on('contextmenu', function (evt) {
                            $(document).off('contextmenu');
                            return false;
                        });
                    }
                    break;

                case 'mousemove':

                    if (this.env.mouseX !== evt.clientX && this.env.mouseY !== evt.clientY) {
                        this.env.mouseIsOver = true;
                    }

                    // prevent strange chrome issues with cursor changes:
                    if (this.env.clientX === evt.clientX && this.env.clientY === evt.clientY) {
                        return;
                    }

                    this.env.clientX = evt.clientX;
                    this.env.clientY = evt.clientY;
                    break;

                case 'focus':
                case 'mouseenter':
                    this.env.mouseIsOver = true;
                    break;

                case 'blur':
                case 'mouseleave':
                    this.env.mouseIsOver = false;
                    break;
            }

            this._promote(type, evt);
        };

        this._keyListener = function (evt) {
            if (!this.env.mouseIsOver) {
                return;
            }

            // make sure we do not mess with input-overlays here:
            if ("|TEXTAREA|INPUT".indexOf('|' + evt.target.tagName.toUpperCase()) > -1) {
                return;
            }

            var ref = this,
                set = (this.getConfig('keys').length > 0) ? this.getConfig('keys') : [{
                    13: function (player) {
                        player.setFullscreen(!player.getIsFullscreen());
                    }, // return;
                    32: function (player, evt) {
                        player.setPlayPause();
                        evt.preventDefault();
                    }, // space
                    39: function (player, evt) {
                        player.setPlayhead('+5');
                        evt.preventDefault();
                    }, // cursor right
                    37: function (player, evt) {
                        player.setPlayhead('-5');
                        evt.preventDefault();
                    }, // cursor left
                    38: function (player, evt) {
                        player.setVolume('+0.05');
                        evt.preventDefault();
                    }, // cursor up
                    40: function (player, evt) {
                        player.setVolume('-0.05');
                        evt.preventDefault();
                    }, // cursor down
                    68: function (player) {
                        player.setDebug();
                    }, // D
                    67: function (player) {
                        $p.utils.log('Config Dump', player.config);
                    }, // C
                    80: function (player) {
                        $p.utils.log('Schedule Dump', player.media);
                    }, // P
                    84: function (player) {
                        $p.utils.log('Cuepoints Dump', player.getCuePoints());
                    } // T
                }];

            this._promote('key', evt);

            $.each(set || [], function () {
                try {
                    this[evt.keyCode](ref, evt);
                } catch (e) {}

                try {
                    this['*'](ref);
                } catch (e) {}
            });
        };

        /*******************************
         DOM manipulations
         *******************************/

        /* make player fill actual viewport */
        this._expandView = function (win, target, targetParent) {

            var winBody = $(win[0].document).find('body'),
                overflow = winBody.css('overflow'),
                isSelf = (win[0] === window.self),
                targetWidthAttr = target.attr('width') || '',
                targetHeightAttr = target.attr('height') || '';

            // prepare target:
            target
                .data('fsdata', {
                    scrollTop: win.scrollTop() || 0,
                    scrollLeft: win.scrollLeft() || 0,
                    targetStyle: target.attr('style') || '',
                    targetWidth: target.width(),
                    targetHeight: target.height(),
                    bodyOverflow: (overflow === 'visible') ? 'auto' : overflow, // prevent IE7 crash
                    bodyOverflowX: winBody.css('overflow-x'), // prevent IE7 crash
                    bodyOverflowY: winBody.css('overflow-y'), // prevent IE7 crash
                    iframeWidth: targetWidthAttr.indexOf('%') > -1 ? targetWidthAttr : parseInt(targetWidthAttr) || 0,
                    iframeHeight: targetHeightAttr.indexOf('%') > -1 ? targetHeightAttr : parseInt(targetHeightAttr) || 0
                })
                .removeAttr('width')
                .removeAttr('height')
                .css({
                    position: isSelf && !targetParent ? 'absolute' : 'fixed', // to prevent Android native browser bad 'fixed' positioning when the player is in the iframe mode
                    display: 'block',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 9999999, // that still not guarantee that the target element will be on top. Theoretically we could move the target element to the body but this causing reload of the iframe so it's not an option.
                    margin: 0,
                    padding: 0
                });

            // prepare target parent
            // check if it's not in the iframe mode and if the targetParent is not <body>
            if (!isSelf && !!targetParent && targetParent[0].tagName !== 'BODY') {
                targetParent
                    .data('fsdata', {
                        overflow: targetParent.css('overflow'),
                        overflowX: targetParent.css('overflow-x'),
                        overflowY: targetParent.css('overflow-y'),
                        styles: targetParent.attr('style')
                    })
                    .attr('style', (!targetParent.attr('style') ? '' : targetParent.attr('style') + '; ') + 'overflow: visible!important;'); // that fixes IE issues with visibility of the element
            }

            // prepare parent window
            win.scrollTop(0).scrollLeft(0);

            winBody.css({
                overflow: 'hidden',
                overflowX: 'hidden',
                overflowY: 'hidden'
            });

            return true;
        };

        /* return player to the original size */
        this._collapseView = function (win, target, targetParent) {
            var isSelf = (win[0] === window.self),
                fsData = target ? target.data('fsdata') : null,
                fsTargetParentData = targetParent ? targetParent.data('fsdata') : null;

            // reset
            if (fsData !== null) {

                $(win[0].document.body)
                    .css({
                        overflow: fsData.bodyOverflow,
                        overflowX: fsData.bodyOverflowX,
                        overflowY: fsData.bodyOverflowY
                    });

                // rebuild iframe:
                if (fsData.iframeWidth > 0 && !isSelf) {
                    target
                        .attr('width', fsData.iframeWidth)
                        .attr('height', fsData.iframeHeight);
                } else {
                    target
                        .width(fsData.targetWidth)
                        .height(fsData.targetHeight);
                }

                target
                    .attr('style', (fsData.targetStyle == null) ? '' : fsData.targetStyle)
                    .data('fsdata', null);

                if (!isSelf && !!fsTargetParentData) {
                    targetParent
                        .attr('style', !fsTargetParentData.styles ? '' : fsTargetParentData.styles)
                        .data('fsdata', null);
                }

                // rebuild parent window state
                win.scrollTop(fsData.scrollTop)
                    .scrollLeft(fsData.scrollLeft);

                return true;
            }

            return false;
        };

        this._enterFullViewport = function () {

            var iframeCfg = this.getConfig('iframe'),
                win = iframeCfg ? this.getIframeParent() || $(window) : $(window),
                target = iframeCfg ? this.getIframe() || this.getDC() : this.getDC(),
                targetParent = target.parent() || null,
                winDocument = $(win[0].document);

            // set isFullViewport flag
            this._isFullViewport = true;

            // add class to eventually create more specific rules for site elements with high z-indexes
            winDocument.find('body').addClass(this.getNS() + 'fullviewport');

            // prevent Android 4.x Browser from scrolling
            $(document).on('touchmove.fullviewport', function (e) {
                e.preventDefault();
            });

            this._expandView(win, target, targetParent);

            return true;
        };

        /* exit player from full viewport mode - "full (parent) window viewport" to be specific */
        this._exitFullViewport = function () {

            var iframeCfg = this.getConfig('iframe'),
                win = iframeCfg ? this.getIframeParent() || $(window) : $(window),
                target = iframeCfg ? this.getIframe() || this.getDC() : this.getDC(),
                targetParent = target.parent() || null,
                winDocument = $(win[0].document);

            this._isFullViewport = false;

            winDocument.find('body').removeClass(this.getNS() + 'fullviewport');

            $(document).off('.fullviewport');

            this._collapseView(win, target, targetParent);

            return true;
        };

        /*******************************
         plugin API wrapper
         *******************************/
        this.pluginAPI = function () {

            var args = Array.prototype.slice.call(arguments) || null,
                dest = args.shift(),
                func = args.shift();

            if (dest != null && func != null) {

                for (var j = 0; j < this._plugins.length; j++) {

                    if (this._plugins[j].name === dest) {
                        this._plugins[j][func](args[0]);
                        return;
                    }
                }
            }
        };

        /*******************************
         public (API) methods GETTERS
         *******************************/
        this.getVersion = function () {
            return this.config._version;
        };

        this.getIsLastItem = function () {
            return this.getNextItem() !== false;
        };

        this.getIsFirstItem = function () {
            return this.getPreviousItem() !== false;
        };

        this.getConfig = function () {

            var idx = this.getItemIdx(),
                name = null,
                result = false;

            if (typeof arguments[0] === 'string') {
                name = arguments[0];
                result = (this.config['_' + name] != null) ? this.config['_' + name] : this.config[name];
            } else if (typeof arguments[0] === 'number') {
                idx = arguments[0];
            }

            if (name == null) {
                return this.media[idx]['config'];
            }

            // get value from item-specific config (beats them all)
            if (this.config['_' + name] == undefined) {

                try {
                    if (this.media[idx]['config'][name] !== undefined) {
                        result = this.media[idx]['config'][name];
                    }
                } catch (e) {}
            }

            if (name.indexOf('plugin_') > -1) {

                try {
                    if (this.media[idx]['config'][name]) {
                        result = $.extend(true, {}, this.config[name], this.media[idx]['config'][name]);
                    }
                } catch (e) {}
            }


            if (result == null) {
                return null;
            }

            if (typeof result === 'object' && result.length === null) {
                result = $.extend(true, {}, result || {});
            } else if (typeof result === 'object') {
                result = $.extend(true, [], result || []);
            }

            if (typeof result === 'string') {

                switch (result) {
                    case 'true':
                        result = true;
                        break;

                    case 'false':
                        result = false;
                        break;

                    case 'NaN':
                    case 'undefined':
                    case 'null':
                        result = null;
                        break;
                }
            }

            return result;
        };

        this.getDC = function () {
            return this.env.playerDom;
        };

        this.getState = function (compare) {

            var result = 'IDLE';

            try {
                result = this.playerModel.getState();
            } catch (e) {}

            if (compare) {
                return (result === compare.toUpperCase());
            }

            return result;
        };

        this.getLoadProgress = function () {

            try {
                return this.playerModel.getLoadProgress();
            } catch (e) {
                return 0;
            }
        };

        this._testItem = function (item) {

            for (var r = 0; r < this.itemRules.length; r++) {
                if (!this.itemRules[r](item)) {
                    return false;
                }
            }
            return true;
        };

        this.getItemAtIdx = function (atidx) {

            var ref = this,
                idx = atidx || 0,
                result = false;

            $.each(this.media.slice(idx), function () {

                if (!ref._testItem(this)) {
                    return true;
                }
                result = this;
                return false;
            });

            return result;
        };

        this.getNextItem = function () {

            var ref = this,
                idx = this.getItemIdx(),
                result = false;

            $.each(this.media.slice(idx + 1), function () {

                if (!ref._testItem(this)) {
                    return true;
                }
                result = this;
                return false;
            });

            if (this.getConfig('loop') && result === false) {

                $.each(this.media.slice(), function () {

                    if (!ref._testItem(this)) {
                        return true;
                    }
                    result = this;
                    return false;
                });
            }

            return result;
        };

        this.getPreviousItem = function () {

            var ref = this,
                idx = this.getItemIdx(),
                result = false;

            $.each(this.media.slice(0, idx).reverse(), function () {

                if (!ref._testItem(this)) {
                    return true;
                }
                result = this;
                return false;
            });

            if (this.getConfig('loop') && result === false) {

                $.each(this.media.slice().reverse(), function () {
                    if (!ref._testItem(this)) {
                        return true;
                    }
                    result = this;
                    return false;
                });
            }
            return result;
        };

        this.getItemCount = function () {
            // ignore NA dummy
            return (this.media.length === 1 && this.media[0].model === 'NA') ? 0 : this.media.length;
        };

        this.getItemId = function (idx) {

            try {
                return this.playerModel.getId();
            } catch (e) {
                return this.getItemAtIdx(idx).id;
            }
        };

        this.getItemIdx = function (itm) {

            var item = itm || {
                    id: false
                },
                id = item.id || this.getItemId();

            return this.media.indexOf(this.media.find(function (item) {
                return item.id === id;
            }));
        };

        this.getCurrentItem = function () {

            var ref = this;
            return $.grep(this.media, function (e) {
                return ref.getItemId() === e.id;
            })[0] || false;
        };

        this.getPlaylist = function () {

            return this.getItem('*');
        };

        this.getItem = function (idx) {

            // ignore NA dummy
            if (this.media.length === 1 && this.media[0].model === 'NA') {
                return false;
            }

            // some shortcuts
            switch (arguments[0] || 'current') {
                case 'next':
                    return this.getNextItem();

                case 'prev':
                    return this.getPreviousItem();

                case 'current':
                    return this.getCurrentItem();

                case '*':
                    return this.media;

                default:
                    return this.getItemAtIdx(idx);
            }
        };

        this.getVolume = function () {
            var volume = ('getIsReady' in this.playerModel && this.playerModel.getIsReady()) ? this.playerModel.getVolume() : this.env.volume,
                fixedVolume = this.getConfig('fixedVolume'),
                isMuted = this.getMuted();

            if (fixedVolume === true) {
                volume = this.getConfig('volume');
            }

            if(isMuted){
                volume = 0;
            }

            return volume;
        };

        this.getMuted = function () {
            return this.env.muted;
        };

        this.getTrackId = function () {

            if (this.getConfig('trackId')) {
                return this.config.trackId;
            }

            if (this._playlistServer != null) {
                return "pl" + this._currentItem;
            }

            return null;
        };

        this.getLoadPlaybackProgress = function () {

            try {
                return this.playerModel.getLoadPlaybackProgress();
            } catch (e) {
                return 0;
            }
        };

        this.getSource = function () {

            try {
                return this.playerModel.getSource()[0].src;
            } catch (e) {
                return false;
            }
        };

        this.getDuration = function () {

            try {
                return this.playerModel.getDuration();
            } catch (e) {
                return 0;
            }
        };

        this.getIsLiveOrDvr = function () {
            try {
                return this._isLive || this.playerModel._isDVR || this.playerModel._isLive;
            } catch (e) {
                return false;
            }
        };

        this.getPosition = function () {

            try {
                return this.playerModel.getPosition() || 0;
            } catch (e) {
                return 0;
            }
        };

        this.getMaxPosition = function () {

            try {
                return this.playerModel.getMaxPosition() || 0;
            } catch (e) {
                return 0;
            }
        };

        this.getFrame = function () {

            try {
                return this.playerModel.getFrame();
            } catch (e) {
                return 0;
            }
        };

        this.getTimeLeft = function () {

            try {
                return this.playerModel.getDuration() - this.playerModel.getPosition();
            } catch (e) {
                return this.getItem().duration;
            }
        };
        /**
         * Basing on fullscreen prioritized array config, currently used platform and device abilities
         * it detects fullscreen type/mode to use.
         *
         * @returns string - full | mediaonly | viewport | none
         */
        this.getFullscreenType = function () {
            var config = this.getConfig('fullscreen') || [],
                usedPlatform = this.getPlatform(),
                fullscreenTypesAvailableForUsedPlatform = this.config._platformsFullscreenConfig[usedPlatform] || [],
                availableFullscreenApiType = $p.fullscreenApi.type,
                fullscreenTypeAvailableForApi = [],
                available = [],
                result = 'none',
                i;

            switch (availableFullscreenApiType) {
                case 'full':
                    fullscreenTypeAvailableForApi = ['full', 'mediaonly'];
                    break;

                case 'mediaonly':
                    fullscreenTypeAvailableForApi = ['mediaonly'];
                    break;

                case 'none':
                    break;
            }

            // if device has support for inlinevideo then there is full viewport mode available
            if ($p.features.inlinevideo) {
                fullscreenTypeAvailableForApi.push('viewport');
            }

            available = $p.utils.intersect($p.utils.intersect(config, fullscreenTypesAvailableForUsedPlatform), fullscreenTypeAvailableForApi);

            // select one from the available fullscreen types with highest configured priority
            for (i = 0; i < config.length; i++) {
                if (available.indexOf(config[i]) > -1) {
                    result = config[i];
                    break;
                }
            }

            return result;
        };

        this.getFullscreenEnabled = function () {
            var fsType = this.getFullscreenType(),
                apiType = $p.fullscreenApi.type,
                result = false;

            switch (fsType) {
                case 'full':
                    result = this._getFullscreenEnabledApi();
                    break;

                case 'mediaonly':
                    /**
                     * there could be 4 cases in this situation:
                     * a) there is only 'mediaonly' fullscreen API available
                     * b) there is 'full' fullscreen API available, but the user prefer 'mediaonly' in config
                     * c) player is in the same-origin <iframe> and has 'mediaonly' fullscreen API available, 
                     *    but there is no <iframe> `allowfullscreen` attribute so we respect that.
                     * d) player is in the crossdomain <iframe> (so we can't check the attributes of the <iframe> element)
                     *    and has 'mediaonly' fullscreen API available, so we try to use it
                     */
                    if (this.getConfig('iframe') && !this.config._isCrossDomain) {
                        result = (this.getIframeAllowFullscreen() && this._getFullscreenEnabledApi(apiType));
                    } else {
                        result = this._getFullscreenEnabledApi(apiType);
                    }
                    break;

                case 'viewport':
                    /**
                     * In this case we just need to check if the player is inside the <iframe>
                     * and if the <iframe> attributes allowing fullscreen. We respect this even if it's
                     * possible to set fullviewport when the <iframe> is from the same domain.
                     * If the player isn't inside the <iframe> then we assume that it's possible to
                     * put the player into fullviewport mode when requested.
                     */
                    if (this.getConfig('iframe') && !this.config._isCrossDomain) {
                        result = this.getIframeAllowFullscreen();
                    } else {
                        result = true;
                    }
                    break;

                    /**
                     * The fullscreen functionality is disabled in configuration
                     */
                case 'none':
                    result = false;
                    break;
            }

            return result;
        };

        this._getFullscreenEnabledApi = function (apiType) {
            var apiType = apiType || $p.fullscreenApi.type,
                fsFullscreenEnabledPropName = $p.fullscreenApi[apiType]['fullscreenEnabled'] || false,
                fsSupportsFullscreenPropName = $p.fullscreenApi[apiType]['supportsFullscreen'] || false,
                result = false;

            switch (apiType) {
                case 'full':
                    // we need to check if the document fullscreenEnabled value is true or false
                    // cause even if the fullscreen API feature is available it could be blocked
                    // through browser configuration and/or <iframe> lack of allowfullscreen attribute
                    result = document[fsFullscreenEnabledPropName];
                    break;

                case 'mediaonly':
                    /**
                     * if the detected fullscreen API is 'mediaonly' then we need to check the status
                     * of current player model media element supportsFullscreen value. This value is
                     * reliable only after HTML <video> metadataloaded event was fired. If there is
                     * no player model media element available at the function execution time we return
                     * false.
                     */
                    if (!!this.playerModel.mediaElement) {
                        result = this.playerModel.mediaElement[0][fsSupportsFullscreenPropName];
                    }
                    break;
            }

            return result;
        };

        this.getIsFullscreen = function () {
            var fsType = this.getFullscreenType(),
                apiType = $p.fullscreenApi.type,
                result = false;

            switch (fsType) {
                case 'full':
                    result = this._getIsFullscreenApi();
                    break;

                case 'mediaonly':
                    /**
                     * there could be 2 cases in this situation:
                     * a) there is only 'mediaonly' fullscreen API available
                     * b) there is 'full' fullscreen API available, but the user prefer 'mediaonly' in config
                     */
                    result = this._getIsFullscreenApi(apiType);
                    break;

                case 'viewport':
                    result = this._isFullViewport;
                    break;

                    /**
                     * The fullscreen functionality is disabled in configuration
                     */
                case 'none':
                    result = false;
                    break;
            }

            return result;
        };

        this._getIsFullscreenApi = function (apiType) {
            var apiType = apiType || $p.fullscreenApi.type,
                fsElementPropName = $p.fullscreenApi[apiType]['fullscreenElement'] || false,
                fsIsFullscreenPropName = $p.fullscreenApi[apiType]['isFullscreen'] || false,
                fsDisplayingFullscreenPropName = $p.fullscreenApi[apiType]['isFullscreen'] || false,
                result = false;

            switch (apiType) {
                case 'full':
                    // NOTE: IE11 and IEMobile on Windows Phone 8.1 don't have isFullscreen property implemented,
                    // but we can use fullscreenElement property instead
                    result = document[fsIsFullscreenPropName] || !!document[fsElementPropName];
                    break;

                case 'mediaonly':
                    if (!!this.playerModel.mediaElement && fsDisplayingFullscreenPropName) {
                        result = this.playerModel.mediaElement[0][fsDisplayingFullscreenPropName];
                    } else {
                        result = this.getDC().hasClass('fullscreen');
                    }
                    break;
            }

            return result;
        };

        this.getMediaContainer = function () {

            // return "buffered" media container
            if (!this.env.mediaContainer) {
                this.env.mediaContainer = $('#' + this.getMediaId());
            }

            // if mediacontainer does not exist ...
            if (this.env.mediaContainer.length === 0 || !$.contains(document.body, this.env.mediaContainer[0])) {

                // and there is a "display", injects media container
                if (this.env.playerDom.find('.' + this.getNS() + 'display').length > 0) {
                    this.env.mediaContainer = $(document.createElement('div'))
                        .attr({
                            'id': this.getId() + "_media"
                        }) // IMPORTANT IDENTIFIER
                        .css({
                            // position: 'absolute',
                            overflow: 'hidden',
                            height: '100%',
                            width: '100%',
                            top: 0,
                            left: 0,
                            padding: 0,
                            margin: 0,
                            display: 'block'
                        })
                        .appendTo(this.env.playerDom.find('.' + this.getNS() + 'display'));
                }
                // else create a 1x1 pixel dummy somewhere
                else {
                    this.env.mediaContainer = $(document.createElement('div'))
                        .attr({
                            id: this.getMediaId()
                        })
                        .css({
                            width: '1px',
                            height: '1px'
                        })
                        .appendTo($(document.body));
                }
            }

            // go for it
            return this.env.mediaContainer;
        };

        this.getMediaId = function () {

            return this.getId() + "_media";
        };

        this.getMediaType = function () {

            // might be called before a model has been initialized
            if ('getSrc' in this.playerModel) {
                return this._getTypeFromFileExtension(this.playerModel.getSrc());
            } else {
                return 'none/none';
            }
        };

        this.getModel = function () {

            try {
                return this.getItem().model;
            } catch (e) {
                return "NA";
            }
        };

        this.getIframeParent = function () {

            try {
                var result = parent.location.host || false;
                return (result === false) ? false : $(parent.window);
            } catch (e) {
                return false;
            }
        };

        this.getIframe = function () {

            try {
                var result = [];

                if (this.config._iframe) {
                    result = window.$(frameElement) || [];
                }
                return (result.length === 0) ? false : result;
            } catch (e) {
                return false;
            }
        };

        this.getIframeAllowFullscreen = function () {

            var result = false;

            try {
                result = window.frameElement.attributes.allowFullscreen || window.frameElement.attributes.mozallowFullscreen || window.frameElement.attributes.webkitallowFullscreen || false;
            } catch (e) {
                result = false;
            }

            return result;
        };

        this.getPlaybackQuality = function () {

            var result = 'auto';

            try {
                result = this.playerModel.getPlaybackQuality();
            } catch (e) {}

            if (result === 'auto') {
                result = this.getConfig('playbackQuality');
            }

            if (result === 'auto' || $.inArray(result, this.getPlaybackQualities()) === -1) {
                result = this.getAppropriateQuality();
            }

            if ($.inArray(result, this.getPlaybackQualities()) === -1) {
                result = 'auto';
            }

            return result;
        };

        this.getPlaybackQualities = function () {

            try {
                return $.extend(true, [], this.getItem().qualities || []);
            } catch (e) {}

            return [];
        };

        this.getCanPlay = function (mimeType, platforms) {
            var ref = this,
                pt = (platforms === undefined) ? Array.from(this.getSupportedPlatforms().keys()) : platforms;

            return pt.some(function (pt) {
                return ref._canPlay(mimeType, pt);
            });
        };

        this.getCanPlayOnPlatforms = function (mimeType) {
            return this._canPlayOnPlatforms(mimeType);
        };

        this.getIsDrmSystemSupported = function (drmSystem) {
            return ($p.drm.supportedDrmSystems.indexOf(drmSystem) > -1);
        };

        this.getPlatform = function (item) {

            var item = item || this.getItem();

            return item.platform || 'browser';
        };

        this.getId = function () {

            return this._id;
        };

        this.getHasGUI = function () {

            try {
                return this.playerModel.getHasGUI();
            } catch (e) {
                return false;
            }
        };

        this.getCssPrefix = this.getNS = function () {

            return this.config._cssClassPrefix || this.config._ns || 'pp';
        };

        this.getPlayerDimensions = function () {

            return {
                width: this.getDC()
                    .width(),
                height: this.getDC()
                    .height()
            };
        };

        this.getMediaDimensions = function () {

            return this.playerModel.getMediaDimensions() || {
                width: 0,
                height: 0
            };
        };

        this.getAppropriateQuality = function (qualities) {

            var quals = qualities || this.getPlaybackQualities() || [];

            if (quals.length === 0) {
                return [];
            }

            var wid = this.env.playerDom.width(),
                hei = this.env.playerDom.height(),
                ratio = $p.utils.roundNumber(wid / hei, 2),
                temp = {};

            // find best available quality-config-set by "minHeight"
            $.each(this.getConfig('playbackQualities') || [], function () {

                // not available
                if ($.inArray(this.key, quals) < 0) {
                    return true;
                }

                // check player-dim against minHeight
                if ((this.minHeight || 0) > hei && temp.minHeight <= hei) {
                    return true;
                }

                // new set in case of higher resolution
                if ((temp.minHeight || 0) > this.minHeight) {
                    return true;
                }

                // check against minWidth - simple case:
                if (typeof this.minWidth === 'number') {
                    if (this.minWidth === 0 && this.minHeight > hei) {
                        return true;
                    }

                    if (this.minWidth > wid) {
                        return true;
                    }

                    temp = this;
                }
                // check against minWidth - aspect ratio
                else if (typeof this.minWidth === 'object') {
                    var ref = this;

                    $.each(this.minWidth, function () {
                        if ((this.ratio || 100) > ratio) {
                            return true;
                        }
                        if (this.minWidth > wid) {
                            return true;
                        }
                        temp = ref;

                        return true;
                    });
                }

                return true;
            });

            return ($.inArray('auto', this.getPlaybackQualities()) > -1) ? 'auto' : temp.key || 'auto';
        };

        /* asynchronously loads external XML and JSON data from server */
        this.getFromUrl = function (url, dest, callback, dataType, auxConfig) {

            var data = null;

            if (callback.substr(0, 1) !== '_') {
                window[callback] = function (data) {

                    try {
                        delete window[callback];
                    } catch (e) {}
                    dest[callback](data);
                };
            }

            if (dataType) {
                dataType = (dataType.indexOf('/') > -1) ? dataType.split('/')[1] : dataType;
            }

            var ajaxConf = {
                url: url,
                complete: function (xhr, status) {

                    if (dataType == undefined) {

                        try {

                            if (xhr.getResponseHeader("Content-Type").indexOf('xml') > -1) {
                                dataType = 'xml';
                            }

                            if (xhr.getResponseHeader("Content-Type").indexOf('json') > -1) {
                                dataType = 'json';
                            }

                            if (xhr.getResponseHeader("Content-Type").indexOf('html') > -1) {
                                dataType = 'html';
                            }
                        } catch (e) {}
                    }
                    data = $p.utils.cleanResponse(xhr.responseText, dataType);

                    if (status !== 'error') {

                        try {
                            dest[callback](data, xhr.responseText, auxConfig);
                        } catch (e) {}
                    }
                },
                error: function (data) {

                    // bypass jq 1.6.1 issues
                    if (dest[callback]) {
                        dest[callback](false);
                    }
                },
                cache: true,
                dataType: dataType
            };
            ajaxConf.xhrFields = {
                withCredentials: false
            };
            ajaxConf.beforeSend = function (xhr) {
                xhr.withCredentials = false;
            };
            $.support.cors = true;
            $.ajax(ajaxConf);

            return this;
        };

        /*******************************
         public (API) methods SETTERS
         *******************************/
        this.setActiveItem = function (mixedData, autoplay) {

            var lastItem = this.getItem(),
                newItem = null,
                ap = this.config._autoplay,
                M;

            if (typeof mixedData === 'string') {

                // prev/next shortcuts
                switch (mixedData) {
                    case 'previous':
                        newItem = this.getPreviousItem();
                        break;

                    case 'next':
                        newItem = this.getNextItem();
                        break;
                }
            } else if (typeof mixedData === 'number') {

                // index number given
                newItem = this.getItemAtIdx(mixedData);
                // wrong argument
            } else {
                return this;
            }

            if (newItem === false) {
                // end of playlist reached
                if (!this.getNextItem()) {
                    this._promote('done');
                }
                // nothing to do
                return this;
            }

            //

            // item change requested
            if (newItem.id !== lastItem.id) {

                // but and denied by config or state
                if (this.getConfig('disallowSkip') === true && ('COMPLETED|IDLE|ERROR'.indexOf(this.getState()) === -1)) {
                    return this;
                }
            }

            // do we have an continuous play situation?
            if (!this.getState('IDLE')) {
                if(newItem.config.hasOwnProperty('continuous')){
                    ap = newItem.config.continuous;
                }
                else {
                    ap = this.config._continuous;
                }
            }

            this._detachplayerModel();

            // reset player class
            var wasFullscreen = this.getIsFullscreen();
            this.getDC().attr('class', this.env.className);

            if (wasFullscreen) {
                this.getDC().addClass('fullscreen');
            }

            // create player instance
            var newModel = newItem.model;

            // model does not exist or is faulty:
            if (!$p.models.has(newModel)) {
                newModel = 'NA';
                newItem.model = newModel;
                newItem.errorCode = 8;
            }

            // start model
            this.playerModel = new playerModel();
            M = $p.models.get(newModel);
            $.extend(this.playerModel, new M());

            this.__promote('synchronizing', 'display');

            this.initPlayerModel({
                media: $.extend(true, {}, newItem),
                model: newModel,
                pp: this,
                environment: $.extend(true, {}, this.env),
                autoplay: (typeof autoplay === 'boolean') ? autoplay : ap,
                quality: this.getPlaybackQuality(),
                fullscreen: wasFullscreen
                // persistent: (ap || this.config._continuous) && (newModel==nextUp)
            });

            this.syncCuePoints();

            return this;
        };

        this.initPlayerModel = function (cfg) {

            this.playerModel._init(cfg);

            // apply item specific class(es) to player
            if (this.getConfig('className', null) != null) {
                this.getDC().addClass(this.getNS() + this.getConfig('className'));
            }
            this.getDC().addClass(this.getNS() + (this.getConfig('streamType') || 'http'));

            if (this.getConfig('streamType').indexOf('dvr') > -1 || this.getConfig('streamType').indexOf('live') > -1) {
                this.getDC().addClass(this.getNS() + 'live');
                this._isLive = true;
            }

            if (!$p.features.csstransitions) {
                this.getDC().addClass('notransitions');
            }

            if ($p.userAgent.isMobile) {
                this.getDC().addClass(this.getNS() + 'mobile');
            }

            if (!$p.features.volumecontrol){
                this.getDC().addClass(this.getNS() + 'novolumecontrol');
            }
        };

        /* queue ready */
        this.setPlay = function () {

            var ref = this;

            if (this.getConfig('thereCanBeOnlyOne')) {
                projekktor('*').each(function () {
                    if (this.getId() !== ref.getId()) {
                        this.setStop();
                    }
                });
            }
            this._enqueue('play', false);

            return this;
        };

        /* queue ready */
        this.setPause = function () {

            this._enqueue('pause', false);

            return this;
        };

        /* queue ready */
        this.setStop = function (toZero) {

            var ref = this;

            if (this.getState('IDLE')) {
                return this;
            }

            if (toZero) {
                this._enqueue(function () {
                    ref.setActiveItem(0);
                });
            } else {
                this._enqueue('stop', false);
            }

            return this;
        };

        /* queue ready */
        this.setPlayPause = function () {

            if (!this.getState('PLAYING')) {
                this.setPlay();
            } else {
                this.setPause();
            }

            return this;
        };

        /* queue ready */
        this.setVolume = function (vol, fadeDelay) {

            var initialVolume = this.getVolume();

            if (this.getConfig('fixedVolume') === true) {
                return this;
            }

            switch (typeof vol) {
                case 'string':
                    var dir = vol.substr(0, 1);
                    vol = parseFloat(vol.substr(1));
                    switch (dir) {
                        case '+':
                            vol = this.getVolume() + vol;
                            break;

                        case '-':
                            vol = this.getVolume() - vol;
                            break;

                        default:
                            vol = this.getVolume();
                    }
                    break;

                case 'number':
                    vol = parseFloat(vol);
                    vol = (vol > 1) ? 1 : vol;
                    vol = (vol < 0) ? 0 : vol;
                    break;

                default:
                    return this;
            }

            if (vol > initialVolume && fadeDelay) {

                if (vol - initialVolume > 0.03) {

                    for (var i = initialVolume; i <= vol; i = i + 0.03) {
                        this._enqueue('volume', i, fadeDelay);
                    }
                    this._enqueue('volume', vol, fadeDelay);
                    return this;
                }
            } else if (vol < initialVolume && fadeDelay) {

                if (initialVolume - vol > 0.03) {

                    for (var i = initialVolume; i >= vol; i = i - 0.03) {
                        this._enqueue('volume', i, fadeDelay);
                    }
                    this._enqueue('volume', vol, fadeDelay);
                    return this;
                }
            }
            this._enqueue('volume', vol);

            return this;
        };

        this.setMuted = function (value) {
            var value = value === undefined ? !this.env.muted : value,
                volume = this.getVolume(),
                isVolumeControllable = $p.features.volumecontrol;

            if(isVolumeControllable){
                if (value && volume > 0) {
                    this.env.lastVolume = volume;
                    this.setVolume(0);
                } else {
                    this.setVolume(typeof this.env.lastVolume === 'number' ? this.env.lastVolume : volume);
                    this.env.lastVolume = null;
                }
            }
            else {
                if(value){
                    this.setVolume(0);
                }
                else {
                    this.setVolume(1);
                }
            }

            return this;
        };

        /* queue ready */
        this.setPlayhead = this.setSeek = function (position) {

            if (this.getConfig('disallowSkip') === true) {
                return this;
            }

            if (typeof position === 'string') {

                var dir = position.substr(0, 1);

                position = parseFloat(position.substr(1));

                if (dir === '+') {
                    position = this.getPosition() + position;
                } else if (dir === '-') {
                    position = this.getPosition() - position;
                } else {
                    position = this.getPosition();
                }
            }

            if (typeof position === 'number') {
                this._enqueue('seek', Math.round(position * 100) / 100);
            }

            return this;
        };

        /* queue ready */
        this.setFrame = function (frame) {

            if (this.getConfig('fps') == null) {
                return this;
            }

            if (this.getConfig('disallowSkip') === true) {
                return this;
            }

            if (typeof frame === 'string') {
                var dir = frame.substr(0, 1);
                frame = parseFloat(frame.substr(1));

                if (dir === '+') {
                    frame = this.getFrame() + frame;
                } else if (dir === '-') {
                    frame = this.getFrame() - frame;
                } else {
                    frame = this.getFrame();
                }
            }

            if (typeof frame === 'number') {
                this._enqueue('frame', frame);
            }

            return this;
        };

        /* queue ready */
        this.setPlayerPoster = function (url) {

            var ref = this;

            this._enqueue(function () {
                ref.setConfig({
                        poster: url
                    },
                    0);
            });
            this._enqueue(function () {
                ref.playerModel.setPosterLive();
            });

            return this;
        };

        this.setConfig = function () {

            var ref = this,
                args = arguments;

            this._enqueue(function () {
                ref._setConfig(args[0] || null, args[1]);
            });

            return this;
        };

        this._setConfig = function () {
            if (!arguments.length) {
                return;
            }

            var confObj = arguments[0],
                dest = '*',
                value = false;

            if (typeof confObj !== 'object') {
                return this;
            }

            if (typeof arguments[1] === 'string' || typeof arguments[1] === 'number') {
                dest = arguments[1];
            } else {
                dest = this.getItemIdx();
            }

            for (var i in confObj) {

                // is constant:
                if (this.config['_' + i] != null) {
                    continue;
                }

                try {
                    value = eval(confObj[i]);
                } catch (e) {
                    value = confObj[i];
                }

                if (dest === '*') {

                    $.each(this.media, function () {
                        if (this.config == null) {
                            this.config = {};
                        }
                        this.config[i] = value;
                    });
                    continue;
                }

                if (this.media[dest] == undefined) {
                    return this;
                }

                if (this.media[dest]['config'] == null) {
                    this.media[dest]['config'] = {};
                }

                this.media[dest]['config'][i] = value;
            }

            return this;
        };

        this.setFullscreen = function (goFullscreen) {
            var goFullscreen = goFullscreen === void(0) ? !this.getIsFullscreen() : goFullscreen; // toggle or use argument value

            // inform player model about going fullscreen
            this.playerModel.applyCommand('fullscreen', goFullscreen);

            return this;
        };

        this._requestFullscreen = function () {
            var fsType = this.getFullscreenType(),
                apiType = $p.fullscreenApi.type,
                result = false;

            switch (fsType) {
                case 'full':
                    result = this._requestFullscreenApi(apiType, fsType);
                    break;

                case 'mediaonly':
                    /**
                     * there could be 2 cases in this situation:
                     * a) there is only 'mediaonly' fullscreen API available
                     * b) there is 'full' fullscreen API available, but the user prefer 'mediaonly' in config
                     */
                    result = this._requestFullscreenApi(apiType, fsType);
                    break;

                case 'viewport':
                    result = this._enterFullViewport();
                    break;

                    /**
                     * The fullscreen functionality is disabled in configuration
                     */
                case 'none':
                    result = false;
                    break;
            }

            return result;
        };

        this._requestFullscreenApi = function (apiType, fsType) {
            var apiType = apiType || $p.fullscreenApi.type,
                fsElement,
                fsRequestFunctionName = $p.fullscreenApi[apiType]['requestFullscreen'] ? $p.fullscreenApi[apiType]['requestFullscreen'] : false,
                fsEnterFunctionName = $p.fullscreenApi[apiType]['enterFullscreen'] ? $p.fullscreenApi[apiType]['enterFullscreen'] : false,
                fsChangeEventName = $p.fullscreenApi[apiType]['fullscreenchange'] ? $p.fullscreenApi[apiType]['fullscreenchange'].substr(2) : false,
                fsErrorEventName = $p.fullscreenApi[apiType]['fullscreenerror'] ? $p.fullscreenApi[apiType]['fullscreenerror'].substr(2) : false,
                fsEventsNS = '.' + this.getNS() + 'fullscreen',
                result = false,
                ref = this;

            switch (apiType) {
                case 'full':
                    if (fsType === 'full') {
                        fsElement = this.getDC();
                    } else if (fsType === 'mediaonly') {
                        if (!!this.playerModel.mediaElement) {
                            fsElement = this.playerModel.mediaElement;

                            // add native controls
                            fsElement.attr('controls', true);
                            result = true;
                        } else {
                            return false;
                        }
                    }

                    // remove all previous event listeners
                    $(document).off(fsEventsNS);

                    // add event listeners
                    if (fsChangeEventName) {

                        $(document).on(fsChangeEventName + fsEventsNS, function (event) {

                            if (!ref.getIsFullscreen()) {

                                if (fsType === 'mediaonly') {

                                    // remove native controls
                                    fsElement.attr('controls', false);
                                }
                                ref.setFullscreen(false);

                                // remove fullscreen event listeners
                                $(document).off(fsEventsNS);
                            }
                        });
                    } else {
                        $p.utils.log('No fullscreenchange event defined.');
                    }

                    if (fsErrorEventName) {

                        $(document).on(fsErrorEventName + fsEventsNS, function (event) {

                            $p.utils.log('fullscreenerror', event);
                            ref.setFullscreen(false);

                            // remove fullscreen event listeners
                            $(document).off(fsEventsNS);
                        });
                    } else {
                        $p.utils.log('No fullscreenerror event defined.');
                    }

                    // request fullscreen
                    fsElement[0][fsRequestFunctionName]();
                    result = true;
                    break;

                case 'mediaonly':
                    if (!!this.playerModel.mediaElement) {

                        fsElement = this.playerModel.mediaElement;
                        fsElement[0][fsEnterFunctionName]();
                        result = true;
                    } else {
                        result = false;
                    }
                    break;
            }

            return result;
        };

        this._exitFullscreen = function () {

            var fsType = this.getFullscreenType(),
                apiType = $p.fullscreenApi.type,
                result = false;

            switch (fsType) {
                case 'full':
                    result = this._exitFullscreenApi();
                    break;

                case 'mediaonly':
                    /**
                     * there could be 2 cases in this situation:
                     * a) there is only 'mediaonly' fullscreen API available
                     * b) there is 'full' fullscreen API available, but the user prefer 'mediaonly' in config
                     */
                    result = this._exitFullscreenApi(apiType);
                    break;

                case 'viewport':
                    result = this._exitFullViewport();
                    break;

                    /**
                     * The fullscreen functionality is disabled in configuration
                     */
                case 'none':
                    result = false;
                    break;
            }

            return result;
        };

        this._exitFullscreenApi = function () {

            var apiType = apiType || $p.fullscreenApi.type,
                fsElement,
                fsExitFunctionName = $p.fullscreenApi[apiType]['exitFullscreen'] ? $p.fullscreenApi[apiType]['exitFullscreen'] : false,
                result = false;

            switch (apiType) {
                case 'full':
                    fsElement = document;
                    this.getIsFullscreen() ? fsElement[fsExitFunctionName]() : null;
                    result = true;
                    break;

                case 'mediaonly':
                    if (!!this.playerModel.mediaElement) {
                        fsElement = this.playerModel.mediaElement[0];
                        fsElement[fsExitFunctionName]();
                        result = true;
                    } else {
                        result = false;
                    }
                    break;
            }

            return result;
        };

        this.setSize = function (data) {

            var target = this.getIframe() || this.getDC(),
                fsdata = target.data('fsdata') || null,
                w = (data && data.width != null) ? data.width :
                (this.getConfig('width') != null) ? this.getConfig('width') : false,
                h = (data && data.height != null) ? data.height :
                (this.getConfig('height') == null && this.getConfig('ratio')) ? Math.round((w || this.getDC()
                    .width()) / this.getConfig('ratio')) :
                (this.getConfig('height') != null) ? this.getConfig('height') : false;

            if (this.getIsFullscreen() && fsdata != null) {
                // remember new dims while in FS
                fsdata.targetWidth = w;
                fsdata.targetHeight = h;
                target.data('fsdata', fsdata);
            } else {
                // apply new dims
                if (w) {
                    target.css({
                        width: w + "px"
                    });
                }
                if (h) {
                    target.css({
                        height: h + "px"
                    });
                }
            }

            try {
                this.playerModel.applyCommand('resize', {
                    width: w,
                    height: h
                });
            } catch (e) {}
        };

        this.setLoop = function (value) {

            this.config._loop = value || !this.config._loop;

            return this;
        };

        this.setDebug = function (value) {

            $p.utils.logging = (value !== undefined) ? value : !$p.utils.logging;

            if ($p.utils.logging) {
                $p.utils.log('DEBUG MODE #' + this.getId() + " Level: " + this.getConfig('debugLevel'));
            }

            return this;
        };

        this.addListener = function (evt, callback) {

            var ref = this;

            this._enqueue(function () {
                ref._addListener(evt, callback);
            });

            return this;
        };

        this._addListener = function (event, callback) {

            var evt = (event.indexOf('.') > -1) ? event.split('.') : [event, 'default'];

            this.listeners.push({
                event: evt[0],
                ns: evt[1],
                callback: callback
            });

            return this;
        };

        /**
         * removes an JS object from the event queue
         *
         * @param {String} name of event to remove
         * @param {Function} [callback]
         * @returns {PPlayer} reference to the current instance of projekktor
         */
        this.removeListener = function (event, callback) {

            var len = this.listeners.length,
                evt = (event.indexOf('.') > -1) ? event.split('.') : [event, '*'],
                toKill = [];

            // gather listeners to remove
            for (var i = 0; i < len; i++) {

                if (this.listeners[i] === undefined) {
                    continue;
                }

                if (this.listeners[i].event != evt[0] && evt[0] !== '*') {
                    continue;
                }

                if ((this.listeners[i].ns != evt[1] && evt[1] !== '*') || (this.listeners[i].callback !== callback && callback != null)) {
                    continue;
                }
                toKill.push(i);
            }

            // than remove them
            for (var i = 0, l = toKill.length; i < l; i++) {
                this.listeners.splice(toKill[i] - i, 1);
            }

            return this;
        };
        /**
         * @deprecated since 1.4.00
         *
         * Adds, removes, replaces item
         *
         * @param {type} item
         * @param {number} [index]
         * @param {boolean} [replace=false]
         * @returns {PPlayer}
         */
        this.setItem = function (item, index, replace) {
            // remove item
            if (item === null) {
                this.removeItemAtIndex(index);
            }
            // add item
            else {
                this.addItems(item, index, replace);
            }
            return this;
        };

        this.setFile = function () {

            var fileNameOrObject = arguments[0] || '',
                dataType = arguments[1] || this._getTypeFromFileExtension(fileNameOrObject),
                parser = arguments[2] || null,
                result = [{
                    file: {
                        src: fileNameOrObject,
                        type: dataType,
                        parser: parser
                    }
                }];

            this._clearqueue();
            this._detachplayerModel();

            // incoming JSON Object / native Projekktor playlist
            if (typeof fileNameOrObject === 'object') {
                $p.utils.log('Applying incoming JS Object', fileNameOrObject);
                this.setPlaylist(fileNameOrObject);
                return this;
            }

            if (result[0].file.type.indexOf('/xml') > -1 || result[0].file.type.indexOf('/json') > -1) {
                // async. loaded playlist
                $p.utils.log('Loading playlist data from ' + result[0].file.src + ' supposed to be ' + result[0].file.type);
                this._promote('scheduleLoading', 1 + this.getItemCount());
                this._playlistServer = result[0].file.src;
                this.getFromUrl(result[0].file.src, this, '_collectParsers', result[0].file.type, parser);
            } else {
                // incoming single file:
                $p.utils.log('Applying single resource:' + result[0].file.src, result);
                this.setPlaylist(result);
            }

            return this;
        };

        this._collectParsers = function () {

            this._syncPlugins('parserscollected', arguments);
            this._promote('scheduleLoaded', arguments);
        };

        this.addParser = function (parserId, parser) {
            if (typeof parserId === 'string' && typeof parser === 'function') {
                this._parsers[parserId.toUpperCase()] = parser;
            } else {
                $p.utils.log('Failed to set improperly defined parser.');
            }
        };

        this.getParser = function (parserId) {
            if (typeof parserId === 'string') {
                return this._parsers[parserId.toUpperCase()];
            } else {
                return function (data) {
                    return (data);
                };
            }
        };

        this.setPlaylist = this.destroy = function (obj) {

            var data = obj || [{
                    file: {
                        src: '',
                        type: 'none/none'
                    }
                }],
                files = data.playlist || data;

            this.media = [];

            // gather and set alternate config from reel:
            try {

                for (var props in data.config) {

                    if (data.config.hasOwnProperty(props)) {

                        if (typeof data.config[props].indexOf('objectfunction') > -1) {
                            continue; // IE SUCKZ
                        }
                        this.config[props] = eval(data.config[props]);
                    }
                }

                if (data.config != null) {
                    $p.utils.log('Updated config var: ' + props + ' to ' + this.config[props]);
                    this._promote('configModified');
                    delete(data.config);
                }
            } catch (e) {}

            // add media items
            this.addItems(files, 0, true);

            this._syncPlugins('reelupdate');
        };

        this.setPlaybackQuality = function (quality) {

            var qual = quality || this.getAppropriateQuality();

            if ($.inArray(qual, this.getItem().qualities || []) > -1) {
                this.playerModel.applyCommand('quality', qual);
                this.setConfig({
                    playbackQuality: qual
                });
            }

            return this;
        };

        this.openUrl = function (cfg) {

            cfg = cfg || {
                url: '',
                target: '',
                pause: false
            };

            if (cfg.url === '') {
                return this;
            }

            if (cfg.pause === true) {
                this.setPause();
            }
            window.open(cfg.url, cfg.target).focus();

            return this;
        };

        /**
         * Removes THIS Projekktor and reconstructs original DOM
         *
         * ENQUEUED
         *
         * @public
         * @return {Object} this
         */
        this.selfDestruct = this.destroy = function () {

                var ref = this;

                this._enqueue(function () {
                    ref._destroy();
                });

                return this;
            },
            this._destroy = function () {

                var ref = this;

                $(this).off();
                this.removePlugins();
                this.playerModel.destroy();
                this._removeGUIListeners();

                $.each(projekktors, function (idx) {

                    try {

                        if (this.getId() === ref.getId() || this.getId() === ref.getId() || this.getParent() === ref.getId()) {
                            projekktors.splice(idx, 1);
                            return;
                        }
                    } catch (e) {}
                });

                this.env.playerDom.replaceWith(this.env.srcNode);
                this._promote('destroyed');
                this.removeListener('*');

                return this;
            };

        /**
         * @public
         * @return {Object} this
         */
        this.reset = function (autoplay) {

                var ref = this;

                try {
                    this.addListener('fullscreen.reset', function () {
                        ref.removeListener('fullscreen.reset');
                        ref._clearqueue();
                        ref._enqueue(function () {
                            ref._reset(autoplay);
                        });
                    });

                    this.setFullscreen(false);
                } catch (e) {
                    // this needs to be fixed
                    // fails with an "this.playerModel.applyCommand is not a function" from time to time
                    // ugly workaround to prevent player to hang up:
                    ref.removeListener('fullscreen.reset');
                    ref._clearqueue();
                    ref._enqueue(function () {
                        ref._reset(autoplay);
                    });
                }

                return this;
            },
            this._reset = function (autoplay) {

                var cleanConfig = {};

                // this._isReady = false;
                $(this).off();
                $((this.getIframe()) ? parent.window.document : document).off(".projekktor");
                $(window).off('.projekktor' + this.getId());

                this.playerModel.destroy();
                this.playerModel = {};
                this._parsers = {};

                this.removePlugins();
                this._removeGUIListeners();
                this.env.mediaContainer = null;

                for (var i in this.config) {
                    if (this.config.hasOwnProperty(i)) {
                        cleanConfig[(i.substr(0, 1) === '_') ? i.substr(1) : i] = this.config[i];
                    }
                }

                cleanConfig['autoplay'] = cleanConfig['loop'] || autoplay;

                return this;
            },
            /********************************************************************************************
             Queue Points
             *********************************************************************************************/
            this.setCuePoint = function (obj, opt, stopProp) {

                var item = (obj.item !== undefined) ? obj.item : this.getItemId(),
                    options = $.extend(true, {
                            offset: 0
                        },
                        opt),
                    stopPropagation = stopProp || false,
                    //should we propagate cuepointsAdd event after cuepoint was added

                    cuePoint = {
                        id: obj.id || $p.utils.randomId(8),
                        group: obj.group || 'default',
                        item: item,
                        on: ($p.utils.toSeconds(obj.on) || 0) + options.offset,
                        off: ($p.utils.toSeconds(obj.off) || $p.utils.toSeconds(obj.on) || 0) + options.offset,
                        value: obj.value || null,
                        callback: obj.callback || function () {},
                        precision: (obj.precision == null) ? 1 : obj.precision,
                        title: (obj.title == null) ? '' : obj.title,
                        once: obj.once || false,
                        blipEvents: obj.blipEvents || [],
                        _listeners: [],
                        _unlocked: false,
                        _active: false,
                        _lastTime: 0,
                        isAvailable: function () {
                            return this._unlocked;
                        },
                        _stateListener: function (state, player) {

                            if ('STOPPED|COMPLETED|DESTROYING'.indexOf(state) > -1) {

                                if (this._active) {

                                    try {
                                        this.callback(false, this, player);
                                    } catch (e) {}
                                }
                                this._active = false;
                                this._lastTime = -1;
                                this._unlocked = false;
                            }
                        },
                        _timeListener: function (time, player) {

                            if (player.getItemId() !== this.item && this.item !== '*') {
                                return;
                            }

                            if (player.getItemId() !== this.item && this.item !== '*') {
                                return;
                            }

                            var timeIdx = (this.precision === 0) ? Math.round(time) : $p.utils.roundNumber(time, this.precision),
                                ref = this;

                            // are we already unlocked?
                            // consider buffer state to unlock future cuepoints for user interactions
                            if (this._unlocked === false) {

                                var approxMaxTimeLoaded = player.getDuration() * player.getLoadProgress() / 100;

                                if (this.on <= approxMaxTimeLoaded || this.on <= timeIdx) {

                                    // trigger unlock-listeners
                                    $.each(this._listeners['unlock'] || [], function () {
                                        this(ref, player);
                                    });
                                    this._unlocked = true;
                                } else {
                                    return;
                                }
                            }

                            // something to do?
                            if (this._lastTime === timeIdx) {
                                return;
                            }

                            var nat = (timeIdx - this._lastTime <= 1 && timeIdx - this._lastTime > 0);

                            // trigger ON
                            if (((timeIdx >= this.on && timeIdx <= this.off) || (timeIdx >= this.on && this.on === this.off && timeIdx <= this.on + 1)) && this._active !== true) {
                                this._active = true;
                                $p.utils.log("Cue Point: [ON " + this.on + "] at " + timeIdx, this);
                                var cp = $.extend(this, {
                                    enabled: true,
                                    seeked: !nat,
                                    player: player
                                });
                                player._promote('cuepoint', cp);

                                try {
                                    this.callback(cp);
                                } catch (e) {}

                                // remove cue point if it should be triggered only once
                                if (this.once) {
                                    player.removeCuePointById(this.id, this.item);
                                }
                            }
                            // trigger OFF
                            else if ((timeIdx < this.on || timeIdx > this.off) && this.off !== this.on && this._active === true) {
                                this._active = false;
                                $p.utils.log("Cue Point: [OFF " + this.off + "] at " + timeIdx, this);

                                var cp = $.extend(this, {
                                    enabled: false,
                                    seeked: !nat,
                                    player: player
                                });
                                player._promote('cuepoint', cp);

                                try {
                                    this.callback(cp);
                                } catch (e) {}

                                // remove cue point if it should be triggered only once
                                if (this.once) {
                                    player.removeCuePointById(this.id, this.item);
                                }
                            }

                            if (this.off === this.on && this._active && Number(timeIdx - this.on).toPrecision(this.precision) >= 1) {
                                this._active = false;
                            }

                            this._lastTime = timeIdx;
                        },
                        addListener: function (event, func) {

                            if (this._listeners[event] == null) {
                                this._listeners[event] = [];
                            }
                            this._listeners[event].push(func || function () {});
                        }
                    };

                if (obj.unlockCallback != null) {
                    cuePoint.addListener('unlock', obj.unlockCallback);
                }

                // create itemidx key
                if (!this._cuePoints.hasOwnProperty(item)) {
                    this._cuePoints[item] = [];
                }
                this._cuePoints[item].push(cuePoint);

                if (!stopPropagation) {
                    this._promote('cuepointsAdd', [cuePoint]);
                }

                return this._cuePoints[item];
            },
            this.setCuePoints = function (cp, itmId, forceItmId, options) {

                var cuepoints = cp || [],
                    itemId = itmId || this.getItemId(),
                    forceItemId = forceItmId || false,
                    ref = this;

                $.each(cuepoints, function () {
                    this.item = forceItemId ? itemId : this.item || itemId; // use given itemId if there is no item id specified per cuepoint or forceItemId is true
                    ref.setCuePoint(this, options, true); // set cuepoint and suppress event propagation after every addition
                });

                if (cuepoints.length) {
                    this._promote('cuepointsAdd', cuepoints);
                }

                return this._cuePoints;
            },
            this.setGotoCuePoint = function (cuePointId, itmId) {
                var currentItemId = this.getItemId(),
                    itemId = itmId || currentItemId;

                if (itemId === currentItemId) {
                    this.setPlayhead(this.getCuePointById(cuePointId, itemId).on);
                } else {
                    //TODO: change playlist item and setPlayhead position
                }

                return this;
            },
            /**
             * Gets cuepoints for specified playlist item
             *
             * @param {String} itmId Playlist item id or wildcard '*' for universal cuepoint added to all of items on the playlist
             * @param {Boolean} withWildcarded Should it get wildcarded ('*') cuepoints too
             * @param {Array} groups Get cuepoints only from given cuepoint groups
             * @returns {Array} Returns array of cuepoints which satisfies the given criteria
             */
            this.getCuePoints = function (itmId, withWildcarded, groups) {
                var itemId = itmId || this.getItemId(),
                    cuePoints = withWildcarded && itemId !== '*' ? $.merge($.merge([], this._cuePoints[itemId] || []), this._cuePoints['*'] || []) : this._cuePoints[itemId] || [],
                    cuePointsGroup = [];

                if (groups && !$.isEmptyObject(cuePoints)) {

                    for (var cIdx = 0; cIdx < cuePoints.length; cIdx++) {
                        if ($.inArray(cuePoints[cIdx].group, groups) > -1) {
                            cuePointsGroup.push(cuePoints[cIdx]);
                        }
                    }
                    return cuePointsGroup;
                }

                return cuePoints;
            },
            /**
             * Gets cuepoint with given id from specified playlist item
             *
             * @param {String} cuePointId
             * @param {String} [itmId=currentItemId]
             * @returns {Object} Returns cuepoint object if the cuepoint exists otherwise false
             */
            this.getCuePointById = function (cuePointId, itmId) {
                var result = false,
                    itemId = itmId || this.getItemId(),
                    cuePoints = this.getCuePoints(itemId);

                for (var j = 0; j < cuePoints.length; j++) {
                    if (cuePoints[j].id === cuePointId) {
                        result = cuePoints[j];
                        break;
                    }
                }
                return result;
            },
            /**
             *
             * @param {String} [itmId=currentItemId]
             * @param {Boolean} [withWildcarded=false]
             * @param {Array} [cuePointGroups]
             * @returns {Array} Array of removed cuepoints
             */
            this.removeCuePoints = function (itmId, withWildcarded, cuePointGroups) {
                var itemId = itmId || this.getItemId(),
                    cuePoints = this._cuePoints,
                    itemKey = {},
                    cpForItem = [],
                    toKill = [],
                    removed = [];

                // remove cuepoints and relevant event listeners
                for (var itemKey in cuePoints) {
                    if (cuePoints.hasOwnProperty(itemKey) && (itemKey === itemId || (withWildcarded ? itemKey === '*' : false))) {
                        cpForItem = cuePoints[itemKey];

                        for (var cIdx = 0, cL = cpForItem.length; cIdx < cL; cIdx++) {

                            if (cuePointGroups === undefined || $.inArray(cpForItem[cIdx].group, cuePointGroups) > -1) {
                                this.removeListener('time', cpForItem[cIdx].timeEventHandler);
                                this.removeListener('state', cpForItem[cIdx].stateEventHandler);
                                toKill.push(cIdx);
                            }
                        }

                        for (var i = 0, l = toKill.length; i < l; i++) {
                            removed.push(cpForItem.splice(toKill[i] - i, 1)[0]);
                        }

                        if (!cpForItem.length) {
                            delete cuePoints[itemKey];
                        }
                        toKill = [];
                    }
                }

                if (removed.length) {
                    this._promote('cuepointsRemove', removed);
                }

                return removed;
            },
            /**
             * Remove cuepoint with given id from specified playlist item
             *
             * @param {String} cuePointId
             * @param {String} [itmId=currentItemId]
             * @returns {Array} Array with removed cuepoint if it was found or empty array otherwise
             */
            this.removeCuePointById = function (cuePointId, itmId) {

                if (typeof cuePointId !== 'string') {
                    return [];
                }

                var itemId = itmId || this.getItemId(),
                    cuePoints = this.getCuePoints(itemId),
                    removed = [];

                for (var cIdx = 0; cIdx < cuePoints.length; cIdx++) {

                    if (cuePoints[cIdx].id === cuePointId) {
                        this.removeListener('time', cuePoints[cIdx].timeEventHandler);
                        this.removeListener('state', cuePoints[cIdx].stateEventHandler);
                        removed = cuePoints.splice(cIdx, 1);
                        break;
                    }
                }

                if (removed.length) {
                    this._promote('cuepointsRemove', removed);
                }

                return removed;
            },
            this.syncCuePoints = function () {

                var ref = this;

                this._enqueue(function () {
                    try {
                        ref._applyCuePoints();
                    } catch (e) {}
                });

                return this;
            },
            this._cuepointsChangeEventHandler = function (cuepoints) {

                var ref = this;

                this._enqueue(function () {
                    try {
                        ref._applyCuePoints();
                    } catch (e) {}
                });
            },
            this._applyCuePoints = function () {

                var ref = this,
                    cuePoints = this.getCuePoints(this.getItemId(), true) || [];

                // remove all cuepoint listeners
                ref.removeListener('*.cuepoint');

                $.each(cuePoints, function (key, cuePointObj) {

                    // attach cuepoint event handlers
                    cuePointObj.timeEventHandler = function (time, player) {
                        try {
                            cuePointObj._timeListener(time, player);
                        } catch (e) {}
                    };

                    cuePointObj.stateEventHandler = function (state, player) {
                        try {
                            cuePointObj._stateListener(state, player);
                        } catch (e) {}
                    };

                    ref.addListener('time.cuepoint', cuePointObj.timeEventHandler);
                    ref.addListener('state.cuepoint', cuePointObj.stateEventHandler);
                });
                this._promote('cuepointsSync', cuePoints);
            },
            /********************************************************************************************
             Command Queue
             *********************************************************************************************/
            this._enqueue = function (command, params, delay) {

                if (command != null) {
                    this._queue.push({
                        command: command,
                        params: params,
                        delay: delay
                    });
                    this._processQueue();
                }
            };

        this._clearqueue = function (command, params) {

            if (this._isReady === true) {
                this._queue = [];
            }
        };

        this._processQueue = function () {

            var ref = this;

            if (this._processing === true) {
                return;
            }
            this._processing = true;

            (function pq() {
                try {

                    var msg = ref._queue.shift();
                    if (msg != null) {

                        if (typeof msg.command === 'string') {
                            if (msg.delay > 0) {
                                setTimeout(function () {
                                    ref.playerModel.applyCommand(msg.command, msg.params);
                                }, msg.delay);
                            } else {
                                ref.playerModel.applyCommand(msg.command, msg.params);
                            }
                        } else {
                            msg.command(ref);
                        }
                    }
                } catch (e) {
                    $p.utils.log("ERROR:", e);
                }

                if (ref._queue.length === 0) {
                    ref._processing = false;
                    return;
                }
                pq();
            })();
        };

        /********************************************************************************************
         GENERAL Tools
         *********************************************************************************************/
        /**
         *
         * @param {string} url or filename containing file extension for which mimeType we want to get
         * @returns {string} one of defined mimeTypes from available models iLove definitions
         * or 'none/none' if there is no such a type or url attribute was other than 'string'
         */
        this._getTypeFromFileExtension = function (url) {

            var regExp = $p.cache.fileExtensionsRegExp,
                extTypes = $p.cache.fileExtensionMimeTypeMap, // file extension -> mimeType map
                extMatch,
                fileExt = 'na'; // file extension string, 'na' -> none/none

            if (!regExp) {

                regExp = function () {

                    var extensions = [];

                    // build regexp matching all known extensions
                    extTypes.forEach(function (mimeType, ext) {
                        extensions.push('\\\.' + ext);
                    });

                    // match last occurrence of the extension 
                    return new RegExp('(' + extensions.join('|') + ')(?!' + extensions.join('|') + ')(?:[\?\/#&]{1}.*|$)', 'i');
                }();

                $p.cache.fileExtensionsRegExp = regExp;
            }

            if (typeof url === 'string') {

                extMatch = url.match(regExp);

                if (extMatch) {
                    fileExt = extMatch[1].replace('.', '');
                }
            }

            return Array.from(extTypes.get(fileExt))[0];
        };

        this._getSupportedPlatforms = function (global) {
            var supportedPlatformsGlobal = $p.cache.platformMimeTypeMap,
                supportedPlatformsLocal = new Map(),
                platformsConfig;

            return function () {
                if (global) {
                    return supportedPlatformsGlobal;
                }

                if (!supportedPlatformsLocal.size) {

                    platformsConfig = this.getConfig('platforms') || ['browser'];

                    // always add 'browser' platform if it's missing
                    if (platformsConfig.indexOf('browser') === -1) {
                        platformsConfig.unshift('browser');
                    }

                    platformsConfig.forEach(function (pt) {

                        if (supportedPlatformsGlobal.has(pt)) {
                            supportedPlatformsLocal.set(pt, supportedPlatformsGlobal.get(pt));
                        }
                    });
                }
                return supportedPlatformsLocal;
            };
        };

        this.getSupportedPlatforms = this._getSupportedPlatforms();

        this.getSupportedPlatformsGlobal = this._getSupportedPlatforms(true);

        this.getPriorityForPlatform = function () {
            var platforms;

            return function (platform) {
                if (!platforms) {
                    platforms = Array.from(this.getSupportedPlatforms());
                }
                return platforms.indexOf(platform);
            };
        }.call(this);

        this.getCanPlayWithDrm = function (drmSystem, mimeType, platforms) {
            var ref = this,
                supportedDrmSystems = $p.drm.supportedDrmSystems,
                modelsILoveSupported = $p.cache.modelsILoveSupported,
                supportedPlatforms = Array.from(ref.getSupportedPlatforms().keys()),
                pt = Array.isArray(platforms) ? $p.utils.intersect(supportedPlatforms, platforms) : supportedPlatforms;

            // check if DRM system is supported at this device
            if (supportedDrmSystems.indexOf(drmSystem) > -1) {
                // check if DRM system is supported for specified mimeType
                return modelsILoveSupported.some(function (iLove) {
                    return (iLove.drm &&
                        iLove.drm.indexOf(drmSystem) > -1 &&
                        iLove.type === mimeType &&
                        $p.utils.intersect(iLove.platform, pt).length
                    );
                });
            }
            return false;
        };

        this._readMediaTag = function (domNode) {
            var result = {},
                htmlTag = '',
                attr = [],
                ref = this;

            if ("VIDEOAUDIO".indexOf(domNode[0].tagName.toUpperCase()) === -1) {
                return false;
            }

            // gather general config attributes:
            // - Safari does not supply default-bools here:
            if (!this.getConfig('ignoreAttributes')) {
                result = {
                    autoplay: ((domNode.attr('autoplay') !== undefined || domNode.prop('autoplay') !== undefined) && domNode.prop('autoplay') !== false) ? true : false,
                    controls: ((domNode.attr('controls') !== undefined || domNode.prop('controls') !== undefined) && domNode.prop('controls') !== false) ? true : false,
                    muted: ((domNode.attr('muted') !== undefined || domNode.prop('muted') !== undefined) && domNode.prop('muted') !== false) ? true : false,
                    loop: ((domNode.attr('autoplay') !== undefined || domNode.prop('loop') !== undefined) && domNode.prop('loop') !== false) ? true : false,
                    title: (domNode.attr('title') !== undefined && domNode.attr('title') !== false) ? domNode.attr('title') : '',
                    poster: (domNode.attr('poster') !== undefined && domNode.attr('poster') !== false) ? domNode.attr('poster') : '',
                    width: (domNode.attr('width') !== undefined && domNode.attr('width') !== false) ? domNode.attr('width') : null,
                    height: (domNode.attr('height') !== undefined && domNode.attr('height') !== false) ? domNode.attr('height') : null
                };
            }

            // IE7+8 and some other idiots do not keep attributes w/o values:
            htmlTag = $($('<div></div>').html($(domNode).clone())).html();
            attr = ['autoplay', 'controls', 'loop', 'muted'];

            for (var i = 0; i < attr.length; i++) {

                if (htmlTag.indexOf(attr[i]) === -1) {
                    continue;
                }
                result[attr[i]] = true;
            }

            // get possible media sources:
            result.playlist = [];
            result.playlist[0] = [];
            result.playlist[0]['config'] = {
                tracks: []
            };

            // ... from "src" attribute:
            if (domNode.attr('src')) {
                result.playlist[0].push({
                    src: domNode.attr('src'),
                    type: domNode.attr('type') || this._getTypeFromFileExtension(domNode.attr('src'))
                });
            }

            // ... from media tag children
            // ... within a lame browser (IE <9) ...
            if (!$('<video/>').get(0).canPlayType) {

                var childNode = domNode;

                do {
                    childNode = childNode.next('source,track');

                    if (childNode.attr('src')) {
                        switch (childNode.get(0).tagName.toUpperCase()) {
                            case 'SOURCE':
                                result.playlist[0].push({
                                    src: childNode.attr('src'),
                                    type: childNode.attr('type') || this._getTypeFromFileExtension(childNode.attr('src')),
                                    quality: childNode.attr('data-quality') || ''
                                });
                                break;

                            case 'TRACK':

                                if ($(this).attr('src')) {
                                    result.playlist[0]['config']['tracks'].push({
                                        src: childNode.attr('src'),
                                        kind: childNode.attr('kind') || 'subtitle',
                                        lang: childNode.attr('srclang') || null,
                                        label: childNode.attr('label') || null
                                    });
                                }
                                break;
                        }
                    }
                } while (childNode.attr('src'));
            }

            // ... within a good browser ...
            if (result.playlist[0].length === 0) {
                domNode.children('source,track').each(function () {
                    if ($(this).attr('src')) {

                        switch ($(this).get(0).tagName.toUpperCase()) {
                            case 'SOURCE':
                                result.playlist[0].push({
                                    src: $(this).attr('src'),
                                    type: $(this).attr('type') || ref._getTypeFromFileExtension($(this)
                                        .attr('src')),
                                    quality: $(this).attr('data-quality') || ''
                                });
                                break;

                            case 'TRACK':
                                result.playlist[0]['config']['tracks'].push({
                                    src: $(this).attr('src'),
                                    kind: $(this).attr('kind') || 'subtitle',
                                    lang: $(this).attr('srclang') || null,
                                    label: $(this).attr('label') || null
                                });
                                break;
                        }
                    }
                });
            }

            return result;
        };

        this._init = function (customNode, customCfg) {

            var theNode = customNode || srcNode,
                theCfg = customCfg || cfg,
                cfgByTag = this._readMediaTag(theNode),
                ref = this,
                iframeParent = this.getIframeParent();

            // -----------------------------------------------------------------------------
            // - 1. GENERAL CONFIG ---------------------------------------------------------
            // -----------------------------------------------------------------------------

            // remember original node HTML for reset and reference purposes:
            this.env.srcNode = theNode.wrap('<div></div>').parent().html();
            theNode.unwrap();

            // remember initial classes
            this.env.className = theNode.attr('class') || '';

            // remember id
            this._id = theNode[0].id || $p.utils.randomId(8);

            if (cfgByTag !== false) {
                // swap videotag->playercontainer
                this.env.playerDom = $('<div/>')
                    .attr({
                        'class': theNode[0].className,
                        'style': theNode.attr('style')
                    });

                theNode.replaceWith(this.env.playerDom);

                // destroy theNode
                theNode.empty().removeAttr('type').removeAttr('src');

                try {
                    theNode.get(0).pause();
                    theNode.get(0).load();
                } catch (e) {}
                $('<div/>').append(theNode).get(0).innerHTML = '';
                theNode = null;
            } else {
                this.env.playerDom = theNode;
            }

            // merge configs we got so far:
            theCfg = $.extend(true, {}, cfgByTag, theCfg);

            for (var i in theCfg) {

                if (this.config['_' + i] != null) {
                    this.config['_' + i] = theCfg[i];
                } else {

                    if (i.indexOf('plugin_') > -1) {
                        this.config[i] = $.extend(this.config[i], theCfg[i]);
                    } else {
                        this.config[i] = theCfg[i];
                    }
                }
            }

            // turn debug mode on/off
            this.setDebug(this.getConfig('debug'));

            // check platforms config is valid
            // should be array with at least 1 platform 'browser' defined
            if (!$.isArray(this.config['_platforms'])) {
                $p.utils.log('ERROR: platforms config must be an array. Reset platforms config to the defaults.');
                this.config['_platforms'] = Object.getPrototypeOf(this.config)['_platforms'] || [];
            }
            // add BROWSER platform if it's not defined in config
            if ($.inArray('browser', this.config['_platforms']) === -1) {
                $p.utils.log('ERROR: "browser" platform not present in platforms config. Adding it.');
                this.config._platforms.unshift('browser');
            }

            // initial DOM scaling
            this.setSize();

            // set initial volume and muted values
            if (this.getConfig('forceMuted')) {
                this.env.muted = true;
            } else {
                this.env.muted = this.storage.restore('muted') !== null ? this.storage.restore('muted') : this.env.muted;
            }

            if (this.env.muted) {
                this.env.volume = 0;
            } else {
                this.env.volume = this.storage.restore('volume') !== null ? this.storage.restore('volume') : this.getConfig('volume');
            }

            // -----------------------------------------------------------------------------
            // - TRIM DEST --------------------------------------------------------------
            // -----------------------------------------------------------------------------

            // make sure we can deal with a domID here:
            this.env.playerDom.attr('id', this._id);

            // load and initialize plugins
            this._registerPlugins();

            // set up iframe environment
            if (this.config._iframe === true) {
                if (iframeParent) {
                    iframeParent.ready(function () {
                        ref._expandView($(window), ref.getDC());
                    });
                } else {
                    ref._expandView($(window), ref.getDC());
                }
            }

            // cross domain
            if (iframeParent === false) {
                this.config._isCrossDomain = true;
            }

            // playlist?
            for (var i in this.config._playlist[0]) {

                // we prefer playlists - search one:
                if (this.config._playlist[0][i].type) {

                    if (this.config._playlist[0][i].type.indexOf('/json') > -1 || this.config._playlist[0][i].type.indexOf('/xml') > -1) {
                        this.setFile(this.config._playlist[0][i].src, this.config._playlist[0][i].type, this.config._playlist[0][i].parser);
                        return this;
                    }
                }
            }

            this.setFile(this.config._playlist);

            return this;
        };

        var ref = this;
        // if there are some initPromises, wait with _init() 
        // until all of them will be fulfilled. Otherwise _init() immediately
        if ($p.initPromises.length > 0) {
            Promise.all($p.initPromises).then(function (result) {
                // clear promises queue
                $p.initPromises.length = 0;
                return ref._init();
            },
                function (reason) {
                    $p.utils.log('initPromises failed: ' + reason);

                });
        }
        else {
            ref._init();
        }
    }

    function Projekktor() {

        var arg = arguments[0],
            instances = [];

        // test media support
        $p.testMediaSupport();

        if (!arguments.length) {
            return projekktors[0] || null;
        }

        // get instances
        // projekktor(idx:number);
        if (typeof arg === 'number') {
            return projekktors[arg];
        }

        // by string selection unique "id" or "*"
        if (typeof arg === 'string') {

            // get all instances
            if (arg === '*') {
                return new Iterator(projekktors);
            }

            // get instance by Jquery OBJ, 'containerId' or selector
            for (var i = 0; i < projekktors.length; i++) {
                try {
                    if (projekktors[i].getId() == arg.id) {
                        instances.push(projekktors[i]);
                        continue;
                    }
                } catch (e) {}
                try {
                    for (var j = 0; j < $(arg).length; j++) {
                        if (projekktors[i].env.playerDom.get(0) == $(arg).get(j)) {
                            instances.push(projekktors[i]);
                            continue;
                        }
                    }
                } catch (e) {}
                try {
                    if (projekktors[i].getParent() == arg) {
                        instances.push(projekktors[i]);
                        continue;
                    }
                } catch (e) {}
                try {
                    if (projekktors[i].getId() == arg) {
                        instances.push(projekktors[i]);
                        continue;
                    }
                } catch (e) {}
            }

            if (instances.length > 0) {
                return (instances.length == 1) ? instances[0] : new Iterator(instances);
            }
        }

        // build instances
        if (instances.length === 0) {
            var cfg = arguments[1] || {},
                callback = arguments[2] || {},
                count = 0,
                playerA;

            if (typeof arg === 'string') {
                $.each($(arg), function () {
                    playerA = new PPlayer($(this), cfg, callback);
                    projekktors.push(playerA);
                    count++;
                });
                return (count > 1) ? new Iterator(projekktors) : playerA;
                // arg is a DOM element
            } else if (arg) {
                projekktors.push(new PPlayer(arg, cfg, callback));
                return new Iterator(projekktors);
            }
        }
    }

    Object.defineProperties(Projekktor, {
        initPromises: {
            value: []
        },
        cache: {
            value: {
                modelsILove: [],
                modelsILoveSupported: undefined,
                platformMimeTypeMap: undefined,
                fileExtensionMimeTypeMap: undefined
            }
        },
        models: {
            value: new Map()
        },
        newModel: {
            value: function (newModelDef, parentModelId) {
                var models = this.models,
                    mILove = this.cache.modelsILove,
                    modelId = newModelDef.modelId,
                    parentModel = models.has(parentModelId) ? models.get(parentModelId).prototype : {},
                    newModel;

                // skip if already exists
                if (models.has(modelId)) {
                    return false;
                }

                // register new model and extend its parent
                newModel = function () {};
                newModel.prototype = $.extend({}, parentModel, newModelDef);

                // add new model to the models register
                models.set(modelId, newModel);

                // add model iLove definitions to the cache
                newModelDef.iLove.forEach(function (iLoveObj) {
                    iLoveObj.model = modelId;
                    mILove.push(iLoveObj);
                });

                return true;
            }
        },
        plugins: {
            value: {}
        },
        /**
         * generates:
         * - platform -> mimeType map 
         * - file extension -> mimeType map 
         * - supported iLoves array
         */
        testMediaSupport: {
            value: function () {

                var fileExtensionMimeTypeMap,
                    platformMimeTypeMap,
                    modelsILoveSupported,
                    mILove;

                // process only once
                if (!$p.cache.platformMimeTypeMap && !$p.cache.fileExtensionMimeTypeMap) {

                    fileExtensionMimeTypeMap = new Map();
                    platformMimeTypeMap = new Map();
                    modelsILoveSupported = [];
                    mILove = $p.cache.modelsILove || [];

                    mILove.forEach(function (iLove) {

                        var platforms = iLove.platform || [],
                            modelId = iLove.model,
                            mimeType = iLove.type,
                            fileExt = iLove.ext;

                        // create file extension -> mimeType map for later use
                        if (!fileExtensionMimeTypeMap.has(fileExt)) {
                            fileExtensionMimeTypeMap.set(fileExt, new Set());
                        }
                        // add mimeType to the set of supported for this platform
                        fileExtensionMimeTypeMap.get(fileExt).add(mimeType);

                        // test mimeType support for every platform specified in iLove
                        platforms.forEach(function (platform) {

                            // check if the platform is known to the player
                            if ($p.platforms.hasOwnProperty(platform)) {

                                // requested platform version is minPlatformVersion from platformsConfig or model prototype
                                var reqPlatformVersion = String($p.models.get(modelId).prototype[platform + 'Version']);

                                // perform version and config check:
                                if ($p.utils.versionCompare($p.platforms[platform](mimeType), reqPlatformVersion)) {

                                    if (!platformMimeTypeMap.has(platform)) {
                                        platformMimeTypeMap.set(platform, new Set());
                                    }
                                    // add mimeType to the set of supported for this platform
                                    platformMimeTypeMap.get(platform).add(mimeType);

                                    modelsILoveSupported.push(iLove);
                                }
                            }
                        });
                    });

                    // cache values
                    $p.cache.fileExtensionMimeTypeMap = fileExtensionMimeTypeMap;
                    $p.cache.platformMimeTypeMap = platformMimeTypeMap;
                    $p.cache.modelsILoveSupported = modelsILoveSupported;
                }
            }
        }
    });

    return Projekktor;

}(window, document, jQuery));
