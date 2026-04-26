# Python 日志怎么写得更专业

我看到很多人 Python 项目一开始都用 `print()` 排查问题。这在简单问题中无可厚非，但是问题一旦开始变得复杂，麻烦也就不可避免了。

这就是我为什么写这篇文章。  
> 注意：本文的评判皆是按照本人标准，如果你不同意，那么你是对的。

首先我们先了解一下 Python 标准库里的 `logging` 模块。

这篇文章分两部分来讲：

- 前半部分先介绍 Python 的 `logging/logger` 模块到底是怎么回事；
- 后半部分再结合我写的项目（[PI_CAR](https://github.com/Wang-yifan666/PI_CAR)）里的日志，看看怎么更好地打日志。

---

## 一、什么是 Python 的 logger 模块

Python 标准库 `logging` 的核心价值，不是简单把一句话打印出来，而是让程序能按照统一规则记录运行状态、重要事件、警告和异常。和 `print` 最大的区别在于，`logging` 能让日志具备**结构、等级和去向**。

一个最基础的例子如下：

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)

logger = logging.getLogger(__name__)

logger.info("service started")
logger.warning("cache miss")
logger.error("database connect failed")
```

这段代码已经体现了 `logging` 的几个核心能力：

1. **日志有等级**  
   你可以区分这是一条普通信息（`INFO`）、警告（`WARNING`）还是错误（`ERROR`）。

2. **日志有统一格式**  
   时间、级别、模块名和正文都会自动带出来。

3. **日志有统一入口**  
   以后你想把日志写到文件、终端，甚至远程系统，都可以继续扩展，而不用改所有业务代码。

在 `logging` 里，有四个最重要的概念。

### 1. Logger

`Logger` 是你在业务代码里真正调用的对象。最常见的写法是：

```python
logger = logging.getLogger(__name__)
```

这样每个模块都能拿到自己的 `logger`，日志里天然带上模块名，定位起来更方便。

### 2. Handler

`Handler` 决定日志发到哪里去。可以输出到终端，也可以写入文件。

### 3. Formatter

`Formatter` 决定日志长什么样，也就是一条日志最终会被格式化成什么字符串。

### 4. Filter

`Filter` 用来筛选日志。它可以决定哪些日志能进入某个输出通道，哪些要被拦住。

理解了这四个概念，你已经学会 `logging`了。（bushi

---

## 二、只会 `logger.info()` 还不够

为什么不够？

比如下面这种写法，在小脚本里完全没问题：

```python
logger.info("startup ok")
logger.error("load model failed")
logger.info(f"user={user_id} login success")
```

但项目一大，就会出现几个严重的问题。

### 1. 不同人的写法不一致

有人喜欢自然语言，有人喜欢 `k=v`，有人喜欢 `f-string`，还有人喜欢直接把 `dict` 打出来。最后整份日志看起来像多个人在不同频道里聊天。

### 2. 信息不完整

像 `"load model failed"` 这种日志看上去有用，其实远远不够。失败的是哪个模块？哪一步？为什么失败？耗时多少？有没有关联的上下文？

### 3. 终端容易被刷爆

如果所有 `INFO` 都直接打到屏幕上，那么大量的日志很快就会把真正重要的事件淹没。

### 4. 后期很难搜索和分析

如果日志正文全是自然语言，字段名不统一，那么 `grep`、筛选、复盘、统计都会很痛苦。

所以，真正有用的日志不只是“能打印出来”，而应该满足下面几个目标：

- 能够快速定位来源；
- 能够表达结果和原因；
- 能够区分详细日志和关键日志；
- 能够让不同模块输出风格一致；
- 能够支撑排障，而不是制造更多噪音。

这就是好日志和“会用 `logging`”的区别。

---

## 三、一个更好的日志系统，第一步是先做日志分层

在实际项目里，日志最常见的问题不是太少，而是太多。所以一个好的日志方案，往往会先解决“分层输出”的问题。

以我这个项目为例。它把日志分成三路：

- **Detailed**：详细日志
- **Brief**：简略日志
- **Console**：终端输出

### 分层职责

- `Detailed` 负责承接 `DEBUG` 及以上的日志，主要用于排查细节，比如循环内部状态、串口收发、导航决策、检测过程等。
- `Brief` 只保留关键事件，目的是避免刷屏。
- `Console` 则与 `Brief` 同步，用来在运行时快速观察系统状态。

也就是说，这个项目并不是把所有日志都原样打印到屏幕和文件里，而是做了信息分层：

- 细节进 `Detailed`
- 关键信号进 `Brief` 和 `Console`

这样的好处非常明显：

- 当你现场看程序运行时，屏幕上不会被大量高频日志淹没；
- 而当你需要深度排查问题时，`Detailed` 里又能保留完整线索。

---

## 四、日志格式不是“好看”就够了，而是要方便排障

这个项目里的日志头格式是固定的：

```text
%(asctime)s.%(msecs)03d - %(levelname)s - [%(source)s] - %(message)s
```

这意味着每一条日志都会天然包含四类信息：

- 时间
- 级别
- 来源模块
- 业务正文

例如这样的真实日志：

```text
2026-03-07 17:58:05.198 - WARNING - [INIT] - platform_detect | err=No module named 'picamera2' | result=fail reason=import_fail
2026-03-07 17:58:05.229 - ERROR - [DETECT] - class_load | result=fail reason='class_file'
2026-03-07 17:58:05.231 - ERROR - [DETECT] - startup | result=fail reason='model_path'
```

只看这三行，就能立刻知道三件事：

1. 问题发生在什么时候；
2. 是哪个模块出的；
3. 结果和原因是什么。

这就是高质量日志的基础：它能在最短时间内把关键信息给到排障的人。

---

## 五、真正让日志变专业的，是 message 的结构化

很多项目虽然用了 `logging`，也给日志头加了时间和等级，但日志正文还是随手写的一句话。这种日志表面看着规范，实际上并不好用。

这里更进一步，直接规定 `message` 本身也要结构化，并采用统一的四段式：

```text
<event> <action> | <key kv...> | result=<...> reason=<...> | cost_ms=<...> id_<name>=<value> ...
```

这个结构非常好用：

- 第一段写事件本身，也就是发生了什么；
- 第二段写关键参数，用 `k=v` 的形式展开；
- 第三段写结果和原因；
- 第四段写耗时和追踪 ID。

例如：

```text
process_exit | returncode=1 stderr_tail="model not found" | result=fail reason=proc_exit | id_run=8c12a3
```

比起一句“进程挂了”，这种结构化 `message` 显然更适合排障、检索和后期分析。

更重要的是，这个规范明确要求：

- 不要直接输出原始 `dict/list`，而要展开成稳定的 `k=v` 结构；
- 字段名统一使用 `snake_case`；
- 单位写进字段名后缀，比如：
  - `cost_ms`
  - `elapsed_s`
  - `dist_m`
  - `heading_deg`

这些细节看起来不起眼，但它们决定了一份日志后面是不是能被稳定地搜索和分析。

---

## 六、别让业务代码到处自由发挥，统一走 `log_event`

很多其他人虽然也在用 `logging`，但业务代码还是到处写 `logger.info()`，然后每个人按自己的想法去拼 `message`。久而久之，日志格式一定会散掉。

这里有一个我很喜欢的做法：业务日志统一走 `log_event()`。

标准调用方式大致如下：

```python
log_event(
    logger,
    source="INIT",
    event="startup",
    action=None,
    key={...},
    result="ok",
    reason="booting",
    cost_ms=12.3,
    ids={"run": "8c12a3"},
    brief=False,
    level=logging.INFO,
)
```

这类统一入口最大的价值，不是“看起来整齐”，而是把虚无缥缈的日志规范变成具体的参数。

业务层只需要回答几个问题：

- 来源是谁？
- 发生了什么事件？
- 关键参数是什么？
- 结果和原因是什么？
- 要不要进入简报？

至于：

- `message` 最终怎么拼接；
- `source` 如何归一化；
- `brief` 如何决定；
- `extra` 字段如何补齐；

都交给日志模块本身去处理。

这样就避免了业务代码到处手写字符串，也避免了不同人写出完全不同风格的日志。

---

## 七、`Filter` 才是控制的关键

很多人用 `logging` 时，对 `Formatter` 很熟，但对 `Filter` 并不重视。实际上，在实际应用里，`Filter` 往往更重要，因为它决定了什么信息值得被看见。

这个项目里有两个很实用的 `Filter`。

### 1. EnsureFieldsFilter

它会为所有日志记录补齐 `source` 和 `brief` 字段，避免 `formatter` 在处理第三方日志或不规范日志时因为缺字段而报错。

### 2. BriefFilter

它的规则非常明确：

- 只允许 `WARNING` 及以上的日志通过；
- 或者允许 `INFO` 且 `brief=True` 的日志通过。

这意味着，不是所有 `INFO` 都有资格进入 `Brief` 和 `Console`。只有关键事件才应该上屏。

这样一来，运行时终端上看到的都是更有价值的信号，而不是一大堆流程噪音。

---

## 八、`brief=True` 的意义，不是“多打印一条”，而是“让关键事件可见”

在很多项目里，终端刷屏的根本原因，是所有日志都默认同等重要。这里通过 `brief=True` 解决了这个问题。

- `brief=False` 是默认值，表示这条 `INFO` 只进 `Detailed`，不进 `Brief/Console`
- `brief=True` 则表示这条 `INFO` 是关键事件，应该进入简报和终端

而且它没有把这个规则完全交给人工，而是进一步维护了一个 `BRIEF_WHITELIST`，例如：

```text
INIT：platform_detect, startup, ready, stop
DETECT：violation_confirm, snapshot_saved, process_exit, violation
ZIP：zip_create
UPLOAD：upload_done, upload_fail
```

这样一来，很多关键事件默认就会进入简报，而普通高频日志则保持沉默。

这个思路本质上是在控制日志系统的“信噪比”：不是日志越多越好，而是越能突出关键信号越好。

---

## 九、`source` 最好要有白名单，不然日志迟早会乱

日志里还有一个很容易被忽视的问题：来源字段失控。

如果没有统一约束，团队里很快就会同时出现：

- `DETECT`
- `Detector`
- `detect`
- `vision`
- `misc`

之类不同写法。

它们可能都在表达同一个模块，但检索时会非常痛苦。

这个项目在这方面做得很彻底。`source` 被限制在白名单中，例如：

```text
INIT
UART
GPS
PATROL
FSM
DETECT
ZIP
UPLOAD
PROCESS
```

而且代码里还有 `_normalize_source()` 去做归一化处理：

- 如果有人误写了 `DECTOR`，代码会自动修正成 `DETECT`
- 如果给了未定义来源，则会回退到 `INIT`

这类约束并不是形式主义。日志的价值很大一部分来自“可检索”，而可检索的前提，就是命名收敛。

---

## 十、格式化值的时候，不要偷懒直接打印对象

这里还有一个细节：它没有简单地 `str(val)` 一把梭，而是专门实现了 `_format_value()` 和 `_format_kvs()`。

例如：

- 布尔值会转成 `true/false`
- 浮点数会做统一格式化
- `list/tuple/set` 会拼成逗号串
- `dict` 会被继续展开成键值对

这个设计的意义在于，日志不再是“随缘字符串”，而是一种稳定、统一、可分析的表达。

你后面要做：

- `grep`
- 统计
- 串联 `id_run / id_upload / id_detect`

都会更容易。

---

## 十一、从真实日志看，这套设计为什么有效（bushi

看一套日志设计是否合理，最终还是要看真实日志。

例如这一段：

```text
2026-03-07 17:58:05.198 - WARNING - [INIT] - platform_detect | err=No module named 'picamera2' | result=fail reason=import_fail
2026-03-07 17:58:05.218 - INFO - [INIT] - config_load | env_override=false prefer_pi=false | result=ok reason=settings_cpp.yaml
2026-03-07 17:58:05.229 - ERROR - [DETECT] - class_load | result=fail reason='class_file'
2026-03-07 17:58:05.231 - ERROR - [DETECT] - startup | result=fail reason='model_path'
2026-03-07 17:58:27.478 - INFO - [INIT] - stop | result=ok reason=main_exit
```

这几条日志非常能体现结构化设计的优势。

它不是只告诉你“出错了”，而是把真正的告诉你哪里错了：

1. 平台检测失败，但是这里是正常现象；
2. 配置加载成功；
3. 检测模块类别加载失败；
4. 检测模块启动失败；
5. 程序最终正常收尾退出。

这种日志不需要额外解释，排障的人一眼就能顺着链路看下去。

---
