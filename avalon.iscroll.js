define(['avalon'], function(avalon) {

    var DEFAULT_OPT = {
            mouseWheel: true,
            infiniteLimit: 25,
            cacheSize: 25,
            showLines: 10,
            emplty: {
                exists: false
            }
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

    if (IScroll) {
        avalon.bindingHandlers.iscroll = function(data, vmodels) {
            var element = data.element,
                args = data.param.match(/[^, ]+/g),
                vm = vmodels[0],
                options = avalon.mix({}, DEFAULT_OPT, vm[args && args[1]] || vm[data.value + 'Options']),
                son = element.children[0],
                grandSon = element.children[0] && element.children[0].children[0],
                eachAttr = son && getAttr(son, 'ms-each'),
                repeatAttr = grandSon && getAttr(grandSon, 'ms-repeat'),
                scroll;

            vm.scrolls = vm.scrolls || {};

            if (eachAttr || repeatAttr) {
                var name, realName, timer,
                    listenerLogs = avalon.range(0, options.showLines - 1);

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
                        if (prevData !== void 0 && arr[prevData] && arr[prevData].$unwatch) {
                            arr[prevData].$unwatch();
                        }
                        if (data !== void 0 && newArr[index]) {
                            newArr[index].$unwatch();
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
                    var arr = vm[name],
                        newArr = vm[realName],
                        i;
                    if (scroll) {
                        listenerLogs = avalon.range(0, options.showLines - 1);
                        newArr.forEach(function(item) {
                            item.$unwatch();
                        });
                        for (i = 0; i < options.showLines; i ++) {
                            if (arr.length > i) {
                                if (newArr[i]) {
                                    newArr.set(i, arr[i].$model);
                                } else {
                                    newArr.push(arr[i].$model);
                                }
                                newArr[i].$watch('$all', (function(index) {
                                    return function(key, value) {
                                        arr[index][key] = value;
                                    };
                                })(i));  // jshint ignore:line
                                arr[i].$watch('$all', (function(index) {
                                    return function(key, value) {
                                        newArr[index][key] = value;
                                    };
                                })(i));  // jshint ignore:line
                            } else {
                                newArr.set(i, options.empty);
                            }
                        }
                        scroll.options.infiniteLimit = options.infiniteLimit;
                        scroll.scrollTo(0, 0, 0);
                        scroll.refresh();
                    } else {
                        newArr.pushArray(vm.$model[name].slice(0, options.showLines));
                        scroll = vm.scrolls[data.value] = new IScroll(element, options);
                        scroll.updateCache(0, avalon.range(0, options.infiniteLimit - 1));
                        bindEvents(vmodels, options, scroll);
                    }
                });

                vm[name].$watch('length', function(value) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
                        if (scroll) {
                            scroll.options.infiniteLimit = value;
                            scroll.updateCache(0, avalon.range(0, value - 1));
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
