define(['avalon'], function(avalon) {

    var DEFAULT_OPT = {
        mouseWheel: true,
        canInfinite: true,
        infiniteLimit: 25,
        cacheSize: 25,
        showLines: 10
    },
        events = ['beforeScrollStart', 'scrollCancel', 'scrollStart', 'scroll', 'scrollEnd', 'flick', 'zoomStart', 'zoomEnd'],
        refreshTimeout = 100;

    function getChildVM(expr, vm, strLen) {
        var t = vm, pre, _t;
        for (var i = 0, len = expr.length; i < len; i++) {
            var k = expr[i];
            _t = t.$model || t;
            if (typeof _t[k] !== 'undefined') {
                pre = t;
                t = _t[k];
            } else {
                return;
            }
        }
        if (strLen > 1) {
            return pre[k]; // jshint ignore:line
        } else {
            return pre;
        }
    }

    function getModel(expr, vmodels){
        var str = expr.split('.'),
            strLen = str.length,
            last = str[strLen-1];
        if (str.length != 1) {
            str.pop();
        }
        for (var i = 0, len = vmodels.length; i < len; i++) {
            var ancestor = vmodels[i];
            var child = getChildVM(str, ancestor, strLen);
            if (typeof child !== 'undefined' && (child.hasOwnProperty(last) || Object.prototype.hasOwnProperty.call(child, last))) {
                return [last, child, ancestor];
            }
        }
        return null;
    }

    function makeArray(length) {
        var ret = [];
        for (var i = 0; i< length; i ++) {
            ret.push(i);
        }
        return ret;
    }

    function getFunc(name, vmodels) {
        var changeVM = getModel(name, vmodels);
        return changeVM && changeVM[1][changeVM[0]];
    }

    function getAttr(el, attrName) {
        return ((el.hasAttributes() ? avalon.slice(el.attributes) : []).filter(function(attr) {
            return !attr.name.indexOf(attrName);
        })[0] || {}).name;
    }

    function bindEvents(vmodels, options, scroll) {
        events.forEach(function(eventName) {
            var funcName = options[eventName] || eventName;
            if (getFunc(funcName, vmodels)) {
                scroll.on(eventName, getFunc(funcName, vmodels));
            }
        });
    }

    function format(data, isDecode){
        return isDecode ? decodeURIComponent(data) : data;
    }

    function queryToJson(qs, isDecode){
        var qList = qs.trim().split("&"),
            json = {},
            i = 0,
            len = qList.length;

        for (; i < len; i++) {
            if (qList[i]) {
                var hash = qList[i].split("="),
                    key = hash[0],
                    value = hash[1];
                // 如果只有key没有value, 那么将全部丢入一个$nullName数组中
                if (hash.length < 2) {
                    value = key;
                    key = '$nullName';
                }
                if (!(key in json)) {
                    // 如果缓存堆栈中没有这个数据，则直接存储
                    json[key] = format(value, isDecode);
                } else {
                    // 如果堆栈中已经存在这个数据，则转换成数组存储
                    json[key] = [].concat(json[key], format(value, isDecode));
                }
            }
        }
        return json;
    }

    if (IScroll) {
        avalon.bindingHandlers.iscroll = function(data, vmodels) {
            var element = data.element,
                vm = vmodels[0],
                options = avalon.mix({}, DEFAULT_OPT, queryToJson(data.param), vm[data.value + 'Options']),
                son = element.children[0],
                grandSon = element.children[0] && element.children[0].children[0],
                eachAttr = son && getAttr(son, 'ms-each'),
                repeatAttr = grandSon && getAttr(grandSon, 'ms-repeat'),
                scroll;

            vm.scrolls = vm.scrolls || {};

            if (options.canInfinite && (eachAttr || repeatAttr) ) {
                var name, realName, timer,
                    listenerLogs = makeArray(options.showLines);

                if (eachAttr) {
                    name = son.getAttribute(eachAttr);
                    son.setAttribute(eachAttr, name + '$');
                } else if (repeatAttr) {
                    name = grandSon.getAttribute(repeatAttr);
                    grandSon.setAttribute(repeatAttr, name + '$');
                }
                if (grandSon) {
                    grandSon.setAttribute('ms-attr-data-index', '$index');
                }

                realName = name + '$';

                avalon.mix(options, {
                    dataset: avalon.noop,
                    dataFiller: function(el, data) {
                        var index = el.dataset.index,
                            arr = vm[name],
                            newArr = vm[realName],
                            prevData = listenerLogs[index],
                            getData;
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
                            getData = getFunc(options.getData || 'getData', vmodels);
                            if (getData) {
                                getData(arr.length, options.cacheSize);
                            }
                        }
                    }
                });

                vm.$watch(name, function() {
                    vm[realName] = vm.$model[name].slice(0, options.showLines);
                    scroll = vm.scrolls[data.value] = new IScroll(element, options);
                    scroll.updateCache(0, makeArray(options.infiniteLimit));
                    bindEvents(vmodels, options, scroll);
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
                scroll = vm.scrolls[data.value] = new IScroll(element, options);
                bindEvents(vmodels, options, scroll);
            }

            vm.$remove = function() {
                if (scroll) {
                    scroll.destroy();
                    scroll = null;
                }
            };

        };
    }


    return avalon;
});
