define([
    'avalon',
    './lib/avalon.getModel',
    './lib/iscroll-infinite'
], function(avalon) {

    var events = ['beforeScrollStart', 'scrollCancel', 'scrollStart', 'scroll', 'scrollEnd', 'flick', 'zoomStart', 'zoomEnd'],
        refreshTimeout = 100;

    function makeArray(length) { // jshint ignore:line
        var ret = [];
        for (var i = 0; i< length; i ++) {
            ret.push(i);
        }
        return ret;
    }

    function getFunc(name, vmodels) { // jshint ignore:line
        var changeVM = avalon.getModel(name, vmodels);
        return changeVM && changeVM[1][changeVM[0]] || avalon.noop;
    }

    function getListAttr(el, attrName) { // jshint ignore:line
        return ((el.hasAttributes() ? avalon.slice(el.attributes) : []).filter(function(attr) {
            return !attr.name.indexOf(attrName);
        })[0] || {}).name;
    }

    function bindEvents(vmodels, scroll) { // jshint ignore:line
        events.forEach(function(eventName) {
            scroll.on(eventName, getFunc(eventName, vmodels));
        });
    }

    var widget = avalon.ui.scroll = function(element, data, vmodels){

        var options = data.scrollOptions,
            vm = vmodels[0],
            scroll,
            eachAttr = element.children[0] && getListAttr(element.children[0], 'ms-each'),
            repeatAttr = element.children[0] && element.children[0].children[0] &&
                getListAttr(element.children[0].children[0], 'ms-repeat');

            vm.scrolls = vm.scrolls || {};

            if (eachAttr || repeatAttr) {
                var name, realName, timer,
                    listenerLogs = makeArray(options.showLines);

                if (eachAttr) {
                    name = element.children[0].getAttribute(eachAttr);
                    element.children[0].setAttribute(eachAttr, name + '$');
                } else if (repeatAttr) {
                    name = element.children[0].children[0].getAttribute(repeatAttr);
                    element.children[0].children[0].setAttribute(repeatAttr, name + '$');
                }
                if (element.children[0].children[0]) {
                    element.children[0].children[0].setAttribute('ms-attr-data-index', '$index');
                }

                realName = name + '$';

                avalon.mix(options, {
                    dataset: avalon.noop,
                    dataFiller: function(el, data) {
                        var index = el.dataset.index,
                            arr = vm[name],
                            newArr = vm[realName],
                            prevData = listenerLogs[index];
                        if (newArr[index]) {
                            newArr[index].$unwatch();
                        }
                        arr[prevData].$unwatch();
                        if (data !== void 0) {
                            newArr.set(index, arr[data]);
                            newArr[index].$watch('$all', function(key, value) {
                                arr[data][key] = value;
                            });
                            arr[data].$watch('$all', function(key, value) {
                                newArr[index][key] = value;
                            });
                            listenerLogs[el.dataset.index] = data;
                        }
                        if (arr.length - 1 == data) {
                            getFunc('getData', vmodels)(arr.length, options.cacheSize);
                        }
                    }
                });

                avalon.scan(element, vmodels);

                vm.$watch(name, function() {
                    vm[realName] = vm.$model[name].slice(0, options.showLines);
                    scroll = vm.scrolls[data.scrollId] = new IScroll(element, options);
                    scroll.updateCache(0, makeArray(options.infiniteLimit));
                    bindEvents(vmodels, scroll);
                    vm.$unwatch(name);
                });

                vm[name].$watch('length', function(value) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
                        if (scroll) {
                            scroll.options.infiniteLimit = value;
                            scroll.updateCache(0, makeArray(value));
                            scroll.refresh();
                        }
                    }, refreshTimeout);
                });

            } else {
                avalon.scan(element, vmodels);
                scroll = vm.scrolls[data.scrollId] = new IScroll(element, options);
                bindEvents(vmodels, scroll);
            }

            vm.$remove = function() {
                if (scroll) {
                    scroll.destroy();
                    scroll = null;
                }
            };
    };

    widget.defaults = {
        mouseWheel: true,
        infiniteLimit: 25,
        cacheSize: 25,
        showLines: 10
    };

    return avalon;
});
