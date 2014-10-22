### Avalon IScroll 移动套件：

@(Work)[Avalon|IScroll]

verison: @lastest 0.1.0

GitHub: [http://github.com/EdwonLim/avalon.iscroll](http://github.com/EdwonLim/avalon.iscroll)

Avalon GitHub & Documents: [https://github.com/RubyLouvre/avalon](https://github.com/RubyLouvre/avalon)

IScroll GitHub & Documents: [https://github.com/cubiq/iscroll](https://github.com/cubiq/iscroll)

#### 1. 简介

- Avalon makes love with IScroll.
- 新增`ms-iscroll`命令，使`Avalon`用户更容易使用`iScroll`。
- 对于`ms-repeat`或`ms-each`，支持`infinite`滚动。

#### 2. 命令

> ms-iscroll="id, optName"

- `id`: 将通过`id`挂在`vmodel`的`scrolls`对象上，便于用户访问`IScroll`对象。
- `optName`: 配置属性的名称，在`vmodel`上寻找对应的属性值，作为配置。

PS： `id`可用`$`占位，`options`也可使用`data-optionKey='optionValue'`和`vm.iscroll`配置，类似于`widget`配置方式。

*注：实际参数请参看`IScroll`文档。*

示例：

`HTML` :

```html
    <div ms-controller="test">
        <div ms-iscroll="scroll1, $opt">
            <ul>
                <li></li>
                ...
            </ul>
        </div>
    </div>
```

`JS` :

```js
    require('avalon.iscroll.js', function(avalon) {

        var test = avalon.define('test', function(vm) {
            ...
            vm.$opt = {
                ... // iScroll 配置
            }
            ...
        });

        avalon.scan();

    });
```

#### 3. `infinite`滚动 & 特殊配置 & 注意事项

*注：本套件依赖于`iscroll-infinite`，所以将列出一些使用`infinite`时的注意事项。*

##### 3.1. 为什么用`infinite`滚动？和一般的`infinite`滚动有何区别？

- 无限滚动，滚到最后加载新数据，在移动端体验比较好。

- `iscroll`提供的`infinite`，使用`translate`进行位移，所以在滚动时，没有进行`dom`的增添，只是修改某一个节点`dom`，重绘的范围比较小，从而保证在移动端的执行效率和内存使用量。并且`avalon`通过`model`操作`view`的方式，非常有利于`dom`节点的数据重新渲染。

##### 3.2. 特殊配置

默认配置：

```js
    {
        showLines: 10, // 显示的数量
        infiniteElements: null, // 重复加载的元素，最好配选择器，默认为avalon array 所绑定的元素
        mouseWheel: false, // 是否支持鼠标滚轮（提出来方便测试）
        infiniteLimit: 25, // 数量极限（到达极限时，会调用getData方法）
        cacheSize: 25, // 缓存数量
        getData: function(start, count) {
            // 加载更多数据的回调
            // 获取数据后，更新源数组即可
            // 同时会触发 el 的 getdata 事件·
        }
    }
```

其中 `showLines` 是 `ms-iscroll` 特殊配置，其他都是`iscroll`配置。

- `showLines`: 一屏显示的数量。

事件监听：

可以在元素上监听`iscroll`的事件，例如`ms-on-scrollstart`。

包含的事件有：`beforescrollstart`, `scrollcancel`, `scrollstart`, `scroll`, `scrollend`, `flick`, `zoomstart`, `zoomend`

##### 3.3. 注意事项

- 如果你的数组名称是`list`，那么请定义一个僵尸数组`list$`。（PS：`avalon`暂时不可以动态添加可监控属性）

```js

    avalon.define('test', function() {
        vm.list = [];
        vm.list$ = [];
    });
```

- 对于`Dom`结构，需要满足`iscroll-infinite`，**需要所有`item`的绝对位置是相同的**，组简单的实现是，把`item`的`position`设为`absolute`。

##### 更改的`scroll-infinite`源码：

- `688`行： 增加 `this._initInfinite();` 让 `scroll` 刷新时，也更新 `infinite`。
- `1433`/`1434`行： 从 `this.infiniteElementHeight = this.infiniteMaster.offsetHeight` 改为 `this.infiniteElementHeight = this.infiniteMaster ? this.infiniteMaster.offsetHeight : 0;` ，支持空数据。
- `1443`/`1444`行： 从 `this.infiniteUpperBufferSize = Math.floor((this.infiniteLength - elementsPerPage) / 2);` 改为 `this.infiniteUpperBufferSize = 0;` 。原来如果行数不足，会把列表居中，现在改为置顶。
