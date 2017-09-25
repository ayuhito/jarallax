/*!
 * Name    : Just Another Parallax [Jarallax]
 * Version : 1.8.0
 * Author  : _nK <https://nkdev.info>
 * GitHub  : https://github.com/nk-o/jarallax
 */
;(function() {
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// test if css property supported by browser
// like "transform"
var tempDiv = document.createElement('div');
function isPropertySupported(property) {
    var prefixes = ['O', 'Moz', 'ms', 'Ms', 'Webkit'];
    var i = prefixes.length;
    if (tempDiv.style[property] !== undefined) {
        return true;
    }
    property = property.charAt(0).toUpperCase() + property.substr(1);
    // eslint-disable-next-line no-empty
    while (--i > -1 && tempDiv.style[prefixes[i] + property] === undefined) {}
    return i >= 0;
}

var supportTransform = isPropertySupported('transform');
var supportTransform3D = isPropertySupported('perspective');

var ua = navigator.userAgent;
var isAndroid = ua.toLowerCase().indexOf('android') > -1;
var isIOs = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
var isFirefox = ua.toLowerCase().indexOf('firefox') > -1;
var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1 || ua.indexOf('Edge/') > -1;
var isIElt10 = document.all && !window.atob;

var wndW = void 0;
var wndH = void 0;
function updateWndVars() {
    wndW = window.innerWidth || document.documentElement.clientWidth;
    wndH = window.innerHeight || document.documentElement.clientHeight;
}
updateWndVars();

// list with all jarallax instances
// need to render all in one scroll/resize event
var jarallaxList = [];

var instanceID = 0;

// Jarallax class

var Jarallax = function () {
    function Jarallax(item, userOptions) {
        _classCallCheck(this, Jarallax);

        var _this = this;

        _this.instanceID = instanceID++;

        _this.$item = item;

        _this.defaults = {
            type: 'scroll', // type of parallax: scroll, scale, opacity, scale-opacity, scroll-opacity
            speed: 0.5, // supported value from -1 to 2
            imgSrc: null,
            imgElement: '.jarallax-img',
            elementInViewport: null,
            zIndex: -100,
            noAndroid: false,
            noIos: true,

            // video
            videoSrc: null,
            videoStartTime: 0,
            videoEndTime: 0,

            // events
            onScroll: null, // function(calculations) {}
            onInit: null, // function() {}
            onDestroy: null, // function() {}
            onCoverImage: null // function() {}
        };

        // DEPRECATED: old data-options
        var deprecatedDataAttribute = _this.$item.getAttribute('data-jarallax');
        var oldDataOptions = JSON.parse(deprecatedDataAttribute || '{}');
        if (deprecatedDataAttribute) {
            console.warn('Detected usage of deprecated data-jarallax JSON options, you should use pure data-attribute options. See info here - https://github.com/nk-o/jarallax/issues/53');
        }

        // prepare data-options
        var dataOptions = _this.$item.dataset;
        var pureDataOptions = {};
        Object.keys(dataOptions).forEach(function (key) {
            var loweCaseOption = key.substr(0, 1).toLowerCase() + key.substr(1);
            if (loweCaseOption && typeof _this.defaults[loweCaseOption] !== 'undefined') {
                pureDataOptions[loweCaseOption] = dataOptions[key];
            }
        });

        _this.options = _this.extend({}, _this.defaults, oldDataOptions, pureDataOptions, userOptions);

        // prepare 'true' and 'false' strings to boolean
        Object.keys(_this.options).forEach(function (key) {
            if (_this.options[key] === 'true') {
                _this.options[key] = true;
            } else if (_this.options[key] === 'false') {
                _this.options[key] = false;
            }
        });

        // stop init if android or ios
        if (!supportTransform || isAndroid && _this.options.noAndroid || isIOs && _this.options.noIos) {
            return;
        }

        // fix speed option [-1.0, 2.0]
        _this.options.speed = Math.min(2, Math.max(-1, parseFloat(_this.options.speed)));

        // custom element to check if parallax in viewport
        var elementInVP = _this.options.elementInViewport;
        // get first item from array
        if (elementInVP && (typeof elementInVP === 'undefined' ? 'undefined' : _typeof(elementInVP)) === 'object' && typeof elementInVP.length !== 'undefined') {
            elementInVP = elementInVP[0];
        }
        // check if dom element
        if (!(elementInVP instanceof Element)) {
            elementInVP = null;
        }
        _this.options.elementInViewport = elementInVP;

        // find image element
        var $imgElement = _this.options.imgElement;
        if ($imgElement && typeof $imgElement === 'string') {
            $imgElement = _this.$item.querySelector($imgElement);
        }
        // check if dom element
        if (!($imgElement instanceof Element)) {
            $imgElement = null;
        }

        _this.image = {
            src: _this.options.imgSrc || null,
            $container: null,
            $item: $imgElement,
            // fix for some devices
            // use <img> instead of background image - more smoothly
            useImgTag: !!$imgElement || isIOs || isAndroid || isIE,

            // position absolute is needed on IE9 and FireFox because fixed position have glitches
            position: !supportTransform3D || isFirefox ? 'absolute' : 'fixed'
        };

        if (_this.initImg()) {
            _this.init();
        }
    }

    // add styles to element


    _createClass(Jarallax, [{
        key: 'css',
        value: function css(el, styles) {
            if (typeof styles === 'string') {
                if (window.getComputedStyle) {
                    return window.getComputedStyle(el).getPropertyValue(styles);
                }
                return el.style[styles];
            }

            // add transform property with vendor prefixes
            if (styles.transform) {
                if (supportTransform3D) {
                    styles.transform += ' translateZ(0)';
                }
                styles.WebkitTransform = styles.transform;
                styles.MozTransform = styles.transform;
                styles.msTransform = styles.transform;
                styles.OTransform = styles.transform;
            }

            Object.keys(styles).forEach(function (key) {
                el.style[key] = styles[key];
            });
            return el;
        }

        // Extend like jQuery.extend

    }, {
        key: 'extend',
        value: function extend(out) {
            var _arguments = arguments;

            out = out || {};
            Object.keys(arguments).forEach(function (i) {
                if (!_arguments[i]) {
                    return;
                }
                Object.keys(_arguments[i]).forEach(function (key) {
                    out[key] = _arguments[i][key];
                });
            });
            return out;
        }

        // Jarallax functions

    }, {
        key: 'initImg',
        value: function initImg() {
            var _this = this;

            // prevent if there is img tag
            if (_this.image.$item) {
                return true;
            }

            // get image src
            if (_this.image.src === null) {
                _this.image.src = _this.css(_this.$item, 'background-image').replace(/^url\(['"]?/g, '').replace(/['"]?\)$/g, '');
            }
            return !(!_this.image.src || _this.image.src === 'none');
        }
    }, {
        key: 'init',
        value: function init() {
            var _this = this;
            var containerStyles = {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                pointerEvents: 'none'
            };
            var imageStyles = {};

            // save default user styles
            _this.$item.setAttribute('data-jarallax-original-styles', _this.$item.getAttribute('style'));

            // set relative position and z-index to the parent
            if (_this.css(_this.$item, 'position') === 'static') {
                _this.css(_this.$item, {
                    position: 'relative'
                });
            }
            if (_this.css(_this.$item, 'z-index') === 'auto') {
                _this.css(_this.$item, {
                    zIndex: 0
                });
            }

            // container for parallax image
            _this.image.$container = document.createElement('div');
            _this.css(_this.image.$container, containerStyles);
            _this.css(_this.image.$container, {
                'z-index': _this.options.zIndex
            });
            _this.image.$container.setAttribute('id', 'jarallax-container-' + _this.instanceID);
            _this.$item.appendChild(_this.image.$container);

            // use img tag
            if (_this.image.useImgTag) {
                if (!_this.image.$item) {
                    _this.image.$item = document.createElement('img');
                    _this.image.$item.setAttribute('src', _this.image.src);
                }

                imageStyles = _this.extend({
                    'object-fit': 'cover',
                    // support for plugin https://github.com/bfred-it/object-fit-images
                    'font-family': 'object-fit: cover;',
                    'max-width': 'none'
                }, containerStyles, imageStyles);

                // use div with background image
            } else {
                _this.image.$item = document.createElement('div');
                imageStyles = _this.extend({
                    'background-position': '50% 50%',
                    'background-size': 'cover',
                    'background-repeat': 'no-repeat no-repeat',
                    'background-image': 'url("' + _this.image.src + '")'
                }, containerStyles, imageStyles);
            }

            // check if one of parents have transform style (without this check, scroll transform will be inverted)
            // discussion - https://github.com/nk-o/jarallax/issues/9
            var parentWithTransform = 0;
            var $itemParents = _this.$item;
            while ($itemParents !== null && $itemParents !== document && parentWithTransform === 0) {
                var parentTransform = _this.css($itemParents, '-webkit-transform') || _this.css($itemParents, '-moz-transform') || _this.css($itemParents, 'transform');
                if (parentTransform && parentTransform !== 'none') {
                    parentWithTransform = 1;

                    // add transform on parallax container if there is parent with transform
                    _this.css(_this.image.$container, {
                        transform: 'translateX(0) translateY(0)'
                    });
                }
                $itemParents = $itemParents.parentNode;
            }

            // absolute position if one of parents have transformations or parallax without scroll
            if (parentWithTransform || _this.options.type === 'opacity' || _this.options.type === 'scale' || _this.options.type === 'scale-opacity' || _this.options.speed === 1) {
                _this.image.position = 'absolute';
            }

            // add position to parallax block
            imageStyles.position = _this.image.position;

            // insert parallax image
            _this.css(_this.image.$item, imageStyles);
            _this.image.$container.appendChild(_this.image.$item);

            // set initial position and size
            _this.coverImage();
            _this.clipContainer();
            _this.onScroll(true);

            // call onInit event
            if (_this.options.onInit) {
                _this.options.onInit.call(_this);
            }

            // timeout to fix IE blinking
            setTimeout(function () {
                if (_this.$item) {
                    // remove default user background
                    _this.css(_this.$item, {
                        'background-image': 'none',
                        'background-attachment': 'scroll',
                        'background-size': 'auto'
                    });
                }
            }, 0);

            jarallaxList.push(_this);
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            var _this = this;

            // remove from instances list
            jarallaxList.forEach(function (item, key) {
                if (item.instanceID === _this.instanceID) {
                    jarallaxList.splice(key, 1);
                }
            });

            // return styles on container as before jarallax init
            var originalStylesTag = _this.$item.getAttribute('data-jarallax-original-styles');
            _this.$item.removeAttribute('data-jarallax-original-styles');
            // null occurs if there is no style tag before jarallax init
            if (originalStylesTag === 'null') {
                _this.$item.removeAttribute('style');
            } else {
                _this.$item.setAttribute('style', originalStylesTag);
            }

            // remove additional dom elements
            if (_this.$clipStyles) {
                _this.$clipStyles.parentNode.removeChild(_this.$clipStyles);
            }
            _this.image.$container.parentNode.removeChild(_this.image.$container);

            // call onDestroy event
            if (_this.options.onDestroy) {
                _this.options.onDestroy.call(_this);
            }

            // delete jarallax from item
            delete _this.$item.jarallax;
        }

        // it will remove some image overlapping
        // overlapping occur due to an image position fixed inside absolute position element (webkit based browsers works without any fix)

    }, {
        key: 'clipContainer',
        value: function clipContainer() {
            // clip is not working properly on real IE9 and less
            if (isIElt10) {
                return;
            }

            var _this = this;
            var rect = _this.image.$container.getBoundingClientRect();
            var width = rect.width;
            var height = rect.height;

            if (!_this.$clipStyles) {
                _this.$clipStyles = document.createElement('style');
                _this.$clipStyles.setAttribute('type', 'text/css');
                _this.$clipStyles.setAttribute('id', '#jarallax-clip-' + _this.instanceID);
                var head = document.head || document.getElementsByTagName('head')[0];
                head.appendChild(_this.$clipStyles);
            }

            var styles = ['#jarallax-container-' + _this.instanceID + ' {', '   clip: rect(0 ' + width + 'px ' + height + 'px 0);', '   clip: rect(0, ' + width + 'px, ' + height + 'px, 0);', '}'].join('\n');

            // add clip styles inline (this method need for support IE8 and less browsers)
            if (_this.$clipStyles.styleSheet) {
                _this.$clipStyles.styleSheet.cssText = styles;
            } else {
                _this.$clipStyles.innerHTML = styles;
            }
        }
    }, {
        key: 'coverImage',
        value: function coverImage() {
            var _this = this;

            var rect = _this.image.$container.getBoundingClientRect();
            var contH = rect.height;
            var speed = _this.options.speed;
            var isScroll = _this.options.type === 'scroll' || _this.options.type === 'scroll-opacity';
            var scrollDist = 0;
            var resultH = contH;
            var resultMT = 0;

            // scroll parallax
            if (isScroll) {
                // scroll distance and height for image
                if (speed < 0) {
                    scrollDist = speed * Math.max(contH, wndH);
                } else {
                    scrollDist = speed * (contH + wndH);
                }

                // size for scroll parallax
                if (speed > 1) {
                    resultH = Math.abs(scrollDist - wndH);
                } else if (speed < 0) {
                    resultH = scrollDist / speed + Math.abs(scrollDist);
                } else {
                    resultH += Math.abs(wndH - contH) * (1 - speed);
                }

                scrollDist /= 2;
            }

            // store scroll distance
            _this.parallaxScrollDistance = scrollDist;

            // vertical center
            if (isScroll) {
                resultMT = (wndH - resultH) / 2;
            } else {
                resultMT = (contH - resultH) / 2;
            }

            // apply result to item
            _this.css(_this.image.$item, {
                height: resultH + 'px',
                marginTop: resultMT + 'px',
                left: _this.image.position === 'fixed' ? rect.left + 'px' : '0',
                width: rect.width + 'px'
            });

            // call onCoverImage event
            if (_this.options.onCoverImage) {
                _this.options.onCoverImage.call(_this);
            }

            // return some useful data. Used in the video cover function
            return {
                image: {
                    height: resultH,
                    marginTop: resultMT
                },
                container: rect
            };
        }
    }, {
        key: 'isVisible',
        value: function isVisible() {
            return this.isElementInViewport || false;
        }
    }, {
        key: 'onScroll',
        value: function onScroll(force) {
            var _this = this;

            var rect = _this.$item.getBoundingClientRect();
            var contT = rect.top;
            var contH = rect.height;
            var styles = {};

            // check if in viewport
            var viewportRect = rect;
            if (_this.options.elementInViewport) {
                viewportRect = _this.options.elementInViewport.getBoundingClientRect();
            }
            _this.isElementInViewport = viewportRect.bottom >= 0 && viewportRect.right >= 0 && viewportRect.top <= wndH && viewportRect.left <= wndW;

            // stop calculations if item is not in viewport
            if (force ? false : !_this.isElementInViewport) {
                return;
            }

            // calculate parallax helping variables
            var beforeTop = Math.max(0, contT);
            var beforeTopEnd = Math.max(0, contH + contT);
            var afterTop = Math.max(0, -contT);
            var beforeBottom = Math.max(0, contT + contH - wndH);
            var beforeBottomEnd = Math.max(0, contH - (contT + contH - wndH));
            var afterBottom = Math.max(0, -contT + wndH - contH);
            var fromViewportCenter = 1 - 2 * (wndH - contT) / (wndH + contH);

            // calculate on how percent of section is visible
            var visiblePercent = 1;
            if (contH < wndH) {
                visiblePercent = 1 - (afterTop || beforeBottom) / contH;
            } else if (beforeTopEnd <= wndH) {
                visiblePercent = beforeTopEnd / wndH;
            } else if (beforeBottomEnd <= wndH) {
                visiblePercent = beforeBottomEnd / wndH;
            }

            // opacity
            if (_this.options.type === 'opacity' || _this.options.type === 'scale-opacity' || _this.options.type === 'scroll-opacity') {
                styles.transform = ''; // empty to add translateZ(0) where it is possible
                styles.opacity = visiblePercent;
            }

            // scale
            if (_this.options.type === 'scale' || _this.options.type === 'scale-opacity') {
                var scale = 1;
                if (_this.options.speed < 0) {
                    scale -= _this.options.speed * visiblePercent;
                } else {
                    scale += _this.options.speed * (1 - visiblePercent);
                }
                styles.transform = 'scale(' + scale + ')';
            }

            // scroll
            if (_this.options.type === 'scroll' || _this.options.type === 'scroll-opacity') {
                var positionY = _this.parallaxScrollDistance * fromViewportCenter;

                // fix if parallax block in absolute position
                if (_this.image.position === 'absolute') {
                    positionY -= contT;
                }

                styles.transform = 'translateY(' + positionY + 'px)';
            }

            _this.css(_this.image.$item, styles);

            // call onScroll event
            if (_this.options.onScroll) {
                _this.options.onScroll.call(_this, {
                    section: rect,

                    beforeTop: beforeTop,
                    beforeTopEnd: beforeTopEnd,
                    afterTop: afterTop,
                    beforeBottom: beforeBottom,
                    beforeBottomEnd: beforeBottomEnd,
                    afterBottom: afterBottom,

                    visiblePercent: visiblePercent,
                    fromViewportCenter: fromViewportCenter
                });
            }
        }
    }]);

    return Jarallax;
}();

// requestAnimationFrame polyfill


var rAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
    setTimeout(callback, 1000 / 60);
};

// init events
function addEventListener(el, eventName, handler) {
    if (el.addEventListener) {
        el.addEventListener(eventName, handler);
    } else {
        el.attachEvent('on' + eventName, function () {
            handler.call(el);
        });
    }
}

function update(e) {
    rAF(function () {
        if (e.type !== 'scroll') {
            updateWndVars();
        }
        jarallaxList.forEach(function (item) {
            // cover image and clip needed only when parallax container was changed
            if (e.type !== 'scroll') {
                item.coverImage();
                item.clipContainer();
            }
            item.onScroll();
        });
    });
}
addEventListener(window, 'scroll', update);
addEventListener(window, 'resize', update);
addEventListener(window, 'orientationchange', update);
addEventListener(window, 'load', update);

// global definition
var plugin = function plugin(items) {
    // check for dom element
    // thanks: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    if ((typeof HTMLElement === 'undefined' ? 'undefined' : _typeof(HTMLElement)) === 'object' ? items instanceof HTMLElement : items && (typeof items === 'undefined' ? 'undefined' : _typeof(items)) === 'object' && items !== null && items.nodeType === 1 && typeof items.nodeName === 'string') {
        items = [items];
    }

    var options = arguments[1];
    var args = Array.prototype.slice.call(arguments, 2);
    var len = items.length;
    var k = 0;
    var ret = void 0;

    for (k; k < len; k++) {
        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object' || typeof options === 'undefined') {
            if (!items[k].jarallax) {
                items[k].jarallax = new Jarallax(items[k], options);
            }
        } else if (items[k].jarallax) {
            // eslint-disable-next-line prefer-spread
            ret = items[k].jarallax[options].apply(items[k].jarallax, args);
        }
        if (typeof ret !== 'undefined') {
            return ret;
        }
    }

    return items;
};
plugin.constructor = Jarallax;

// no conflict
var oldPlugin = window.jarallax;
window.jarallax = plugin;
window.jarallax.noConflict = function () {
    window.jarallax = oldPlugin;
    return this;
};

// jQuery support
if (typeof jQuery !== 'undefined') {
    var jQueryPlugin = function jQueryPlugin() {
        var args = arguments || [];
        Array.prototype.unshift.call(args, this);
        var res = plugin.apply(window, args);
        return (typeof res === 'undefined' ? 'undefined' : _typeof(res)) !== 'object' ? res : this;
    };
    jQueryPlugin.constructor = Jarallax;

    // no conflict
    var oldJqPlugin = jQuery.fn.jarallax;
    jQuery.fn.jarallax = jQueryPlugin;
    jQuery.fn.jarallax.noConflict = function () {
        jQuery.fn.jarallax = oldJqPlugin;
        return this;
    };
}

// data-jarallax initialization
addEventListener(window, 'DOMContentLoaded', function () {
    plugin(document.querySelectorAll('[data-jarallax], [data-jarallax-video]'));
});
}());