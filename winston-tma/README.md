# winston-tma

`winston-tma`提供基于[winston](https://github.com/flatiron/winston "winston")的tma扩展,以提供符合tma框架的日志格式与输出.

在`winston-tma`中提供3种`transport`对象:

* __TmaBase:__ 提供符合'tma日志'的基础类;
* __TmaRotate:__ 提供按大小输出的滚动日志;
* __TmaDate:__ 提供按日期输出的日志;
* __TmaRemote:__ 输出至远程日志(tma.tmalog)

并提供一种自定义日志级别:

* __TmaConfig:__ 提供符合tma框架标准的日志级别与颜色值;

以及相关的辅助方法:

* __Formatter:__ 提供了符合tma日志格式标准的内容格式化方法;
* __DateFormat:__ 定义了与时间相关日志滚动的处理方法;

__请注意:如果你的服务在`tma平台`上运行,应直接使用tma-logs模块,更为便捷__

## 安装

`npm install -g winston-tma`

## 使用

```js
const winston = require('winston');
// Requiring `winston-tma` will expose

// transports
// `winston.transport.TmaRotate`
// `winston.transport.TmaDate`
// `winston.transport.TmaRemote`

// config
// `winston.config.tma.levels`
// `winston.config.tma.colors`
require('winston-tma');
```

## 日志格式

对于支持[formatter](https://github.com/winstonjs/winston#custom-log-format)的`transport`对象,`winston-tma`提供2种方法格式化日志内容:

* __详细日志:__ Formatter.Detail([options])
* __精简日志:__ Formatter.Simple([options])

__options__:

* __separ__: 日志内容项与项之间的分隔符,*默认值为|*

### 详细日志:

```js
const winston = require('winston');
const winstonTma = require('winston-tma');

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            formatter: winstonTma.Formatter.Detail()
        })
    ]
});
```

输出日志的格式为: `日期 时间|PID|日志级别|文件名与行号|内容`
其中`文件名与行号`部分可选

### 精简日志

```js
const winston = require('winston');
const winstonTma = require('winston-tma');
const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            formatter: winstonTma.Formatter.Simple()
        })
    ]
});
```

输出日志的格式为: `日期 时间|内容`

## TmaConfig

`winston.config.tma` 提供了符合tma框架标准的日志级别(`levels`)与颜色(`colors`)

tma框架的日志级别从低到高(及其对应的颜色)为:

* info: white
* debug: cyan
* warn: yellow
* error: red
* none: grey

在使用时需要主动引入:

```js
logger.setLevels(winston.config.tma.levels);
winston.addColors(winston.config.tma.colors);
```

## TmaBase

此模块可单独使用,也可作为其他日志模块的基类.
模块实现了与现有`tma`日志类似的管理方式:

* 定时重新打开日志文件,以便获取`fd`的变更.(当用户删除/移动当前文件后,模块会自动创建新文件);
* 在文件打开的过程中,产生的日志将会写入临时内存队列,等待文件打开完成后一次性写入.(只要不超过队列最大长度,所有日志均会写入文件);
* 此模块使用文件名`options filename`作缓存, 所以使用相同的`options.filename`,多次实例化此模块仅会产生一个单例(共享一个实例).

### 独立使用

```js
winston.add(winston.transports.TmaBase, options);
```

__options__:

* __filename__: 输出的文件名
* __interval__: 重新打开日志文件的间隔, *默认值为5000ms*
* __bufferSize__: 临时队列的最大长度(单位为条), *默认值为 10000条*
* __prefix__: 每条日志内容前缀, *默认值为空*
* __formatter__: 定义日志内容格式化方法, *默认值为Formatter.Detail()*

### 作为其他类的基类

需要重写如下2个对象:

* TmaBase.prototype.name: Transport 模块名
* TmaBase.prototype._checkfile(callback): 当重新打开日志文件时会调用此函数,函数处理完成之后,应显示调用`callback([err])`

例如:

```js
const TmaFile = (options) => {
    let instance = TmaBase.call(this, options);
    // 由于父类存在缓存,所以这里需判断父类是否有返回值,如存在(命中缓存)则直接返回无需继续初始化
    if (instance) {
        return instance;
    }
    // 业务代码
}
util.inherits(TmaFile, TmaBase);
TmaFile.prototype.name = 'tmaFile';

TmaFile.prototype._checkfile = function(cb) {
    // 业务代码
    cb();
};
winston.transports.TmaFile = TmaFile;
```

## TmaRotate

此模块继承于`TmaBase`
提供按文件大小输出的滚动日志
当到达设定的最大大小时, 会自动向下滚动,并创建一个新的日志文件.

例如: app.log文件写到最大大小,则会执行如下过程:

>delete app\_n.log
>app\_n-1.log ===> app\_n.log
>... ...
>app\_1.log ===> app\_2.log
>app.log ===> app\_1.log
>create app.log

```js
winston.add(winston.transports.TmaRotate, options);
```

__options__:

* __filename__: 输出的文件名
* __maxFiles__: 最大的文件总数(也就是例子中的n). *默认值为10*
* __maxSize__: 单文件最大大小(单位为bytes), *默认值为10M*
* __concatStr__: 日志文件名中字符间的连接符, *默认值为_*
* __formatter__: 定义日志内容格式化方法, *默认值为Formatter.Detail()*

### TmaRotate.Master

如果业务脚本通过[Cluster](http://www.nodejs.org/api/cluster.html "Cluster")
(多进程方式启动的): Worker则只负责写入文件、而移动文件由Master完成,以解决多进程资源竞争问题.

当服务进程(Worker)打开日志文件准备写入时会向主进程发送消息,如下:

```js
{
    cmd: 'log:rotate',
    msg: {
        filename: String, // 文件名
        interval: Number, // 多久打开一回文件
        maxFiles: Number, // 最大文件数
        maxSize: Number, // 最大单个文件大小
        concatStr: String // 日志文件名中字符间的连接符
    }
}
```

主进程(Master)收到消息后,需透传给`TmaRotate.Master.start`方法,完整的例子如下:

```js
worker.on('message', (msg) => {
    if (msg && typeof msg === 'object' && msg.cmd === 'log:rotate') {
        let data = msg.msg;
        TmaRotate.Master.start(data.filename, data.interval, data.maxFiles, data.maxSize, data.concatStr);
    }
});
process.on('exit', function() {
    TmaRotate.Master.close();
});
```

__如果服务通过node-eyes运行,无需显示调用此模块.只需按照平时的写法`console.[log|info|warn|error]`即可正确的输出滚动日志__

## DateFormat

定义了与时间相关的日志(`TmaDate`、`TmaRemote`)滚动的处理方法:

* 按1天日志: LogByDay([interval, pattern])
  * __interval__: 1 _每隔一天滚动一份日志_
  * __pattern__: %Y%m%d _年月日_ (如:20150101)

* 按1小时日志: LogByHour([interval, pattern])
  * __interval__: 1 _每隔一小时滚动一份日志_
  * __pattern__: %Y%m%d%H _年月日小时_ (如:2015010110)

* 按10分钟日志: LogByMinute([interval, pattern])
  * __interval__: 10 _每隔十分钟滚动一份日志_
  * __pattern__: %Y%m%d%H%M _年月日小时分钟_ (如:201501011020)

* 其中`pattern`为日志文件明中的时间格式, 可参见`linux strftime`

### 例子

每隔1天滚动一份日志

> DateFormat.LogByDay
> 或者
> new DateFormat.LogByDay()

每隔20分钟滚动一份日志
> new DateFormat.LogByMinute(20)

每隔20分钟滚动一份日志,文件名中时间格式为 %Y-%m-%d_%H:%M
> new DateFormat.LogByMinute(20, '%Y-%m-%d_%H:%M')

## TmaDate

此模块继承于`TmaBase`

提供按日期(年、月、日、小时、分)输出的日志
当到达设定的时间间隔时, 会自动创建一个新的日志文件
输出的文件名的格式为: filename\_[%Y|%m|%d|%H|%M].log, 如:app\_20141015.log

```js
winston.add(winston.transports.TmaDate, options);
```

__options__:

* __filename__: 输出的文件名
* __concatStr__: 日志文件名中字符间的连接符, *默认值为 _*
* __format__: 创建新文件的间隔, 为DateFormat对象. *默认值为 FORMAT.LogByDay*
* __formatter__: 定义日志内容格式化, *默认值为Formatter.Simple()*

为了方便使用 TmaDate.FORMAT = DateFormat

## TmaRemote

提供远程日志的功能,会将日志输出至`tma.tmalog.LogObj`服务.
请注意:这里并不是一收到日志就会发送,而是将日志整合在一起定时发送.

```js
const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.TmaRemote)(options)
    ]
});
```

__options__:

* __filename__: 远端日志文件名(不需要包含日期、路径等附加信息);
* __tmaConfig__: tma配置文件路径或已配置的`tma-rpc.util.configure`实例;
* __interval__: 发送日志的间隔, *默认值为500ms*;

