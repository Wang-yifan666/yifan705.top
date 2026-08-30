# 在 VS Code 上搭建 ESP-IDF（ESP32）开发环境

## 前言

最近开始接触 ESP32，于是准备在 VS Code 中使用 Espressif 官方的 ESP-IDF 进行开发。

本来以为环境搭建应该只需要：

> 安装插件 → 选择 ESP-IDF 版本 → 等待安装 → 完成

但我的电脑上已经存在 Miniconda、YOLO 等 Python 开发环境，所以实际安装过程中遇到了一些环境冲突：

1. **EIM（ESP-IDF Installation Manager）使用了过旧的 Python 3.8，导致 Python 环境安装失败；**
2. **即使安装了新的 Python 3.14，由于 PATH 中 Miniconda 的优先级更高，直接执行 `python` 时仍然进入 Python 3.8。**

同时，我也不希望为了 ESP32 开发而影响原有的 YOLO、Python 和 C++ 环境。

因此最后采用的思路是：

```text
VS Code Profile
    +
独立 Python
    +
临时 PATH
````

尽可能把不同开发环境隔离开。

这篇文章主要记录两部分内容：

* 正常情况下如何在 VS Code 中安装 ESP-IDF；
* 如果电脑中存在多个 Python 环境，如何处理 EIM 的 Python 版本冲突。

---

# 一、环境隔离思路

我的电脑本身已经用于其他开发工作，因此一开始就有一个比较明确的要求：

> ESP-IDF 的插件、Python 和工具链尽量不要影响现有环境。

大致希望最终形成这样的结构：

```text
VS Code
├── 原有开发 Profile
│   └── YOLO / Python / C++ 等环境
│
└── ESP32 Profile
    └── ESP-IDF Extension
```

Python 环境则保持：

```text
Miniconda / Python 3.8
└── 原有项目继续使用

Python 3.14
└── 提供给 ESP-IDF 安装过程使用
```

ESP-IDF 本身则单独安装，例如：

```text
D:\Espressif
```

因此整个隔离主要分成两层：

1. **VS Code 层面：使用 Profile 隔离插件和配置；**
2. **系统环境层面：不破坏原来的 Miniconda，通过独立 Python 和临时 PATH 解决冲突。**

---

# 二、使用 VS Code Profile 隔离插件

如果直接在平时使用的 VS Code 环境中安装 ESP-IDF Extension，那么以后即使正在开发 YOLO 或其他项目，也会看到 ESP-IDF 相关的插件、命令和界面。

VS Code 提供了一个很适合这种场景的功能：

> **Profile（配置文件）**

Profile 可以分别保存不同的：

```text
Extensions
Settings
Keyboard Shortcuts
Snippets
UI Layout
```

也就是说，可以给 ESP32 单独准备一套 VS Code 环境。

按下：

```text
Ctrl + Shift + P
```

搜索：

```text
配置文件
```

选择创建新的配置文件。

建议创建一个：(毕竟你也不想在写 c++ 的时候突然出现一个新建 esp 工程吧)

```text
ESP32
```

并使用 **空配置文件（Empty Profile）**。

相比从已有 Profile 复制，空配置文件不会顺带继承原来大量 Python、YOLO 或其他项目相关的插件。

最终大概会形成：

```text
VS Code
├── 原有 Profile
│   ├── Python
│   ├── Pylance
│   ├── C/C++
│   └── 其他开发插件
│
└── ESP32 Profile
    └── ESP-IDF Extension
```

这样 ESP-IDF Extension 只存在于 ESP32 Profile 中。

需要注意：

> VS Code Profile 隔离的是 VS Code 本身的插件和配置，并不能隔离 Windows 的 PATH、Python 等系统环境。

后面遇到的 Python 冲突，就属于系统环境层面的问题。

---

# 三、安装 ESP-IDF Extension

切换到刚刚创建的 `ESP32` Profile。

打开 VS Code 扩展页面：

```text
Ctrl + Shift + X
```

搜索：

```text
ESP-IDF
```

安装 Espressif Systems 官方提供的 ESP-IDF Extension。

安装完成后，按下：

```text
Ctrl + Shift + P
```

执行：

```text
ESP-IDF: Open ESP-IDF Installation Manager
```

进入 ESP-IDF Installation Manager，也就是 EIM。

---

# 四、使用 EIM 安装 ESP-IDF

## 4.1 选择下载源

EIM 会提供几个下载源，例如：

```text
Github
Espressif (faster in China)
Open Releases URL
```

![EIM 选择下载源](assets/images/esp_images.png)

我在国内可以选择：

```text
Espressif (faster in China)
```

---

## 4.2 选择 ESP-IDF 版本

![选择 ESP-IDF 版本](assets/images/esp_version.png)

我安装时选择的是：

```text
ESP-IDF v6.1
```

建议正常学习和开发时优先选择正式版本，而不是：

```text
v6.1-beta
v6.1-rc
```

---

## 4.3 设置安装位置

ESP-IDF 默认可能安装到 C 盘。

如果不希望开发工具占用过多 C 盘空间，可以选择：

```text
Install on a different drive
```

例如：

```text
D:\Espressif
```

这样开发工具可以统一放在 D 盘。

例如：

```text
D:\
├── Espressif\
│   └── ESP-IDF 及相关工具
│
└── Code\
    ├── ESP32\
    ├── YOLO\
    └── ...
```

我个人比较习惯把：

```text
开发工具
```

和：

```text
项目代码
```

分开放。

另外，嵌入式开发环境中的路径建议尽量使用：

```text
纯英文
无空格
```

虽然现在很多工具已经能够处理中文路径和空格，但避免复杂路径仍然可以减少一些不必要的问题。

---

# 五、正常情况下，安装到这里就结束了

如果 EIM 最终显示：

```text
Installation Complete!
```

![ESP-IDF 安装完成](assets/images/esp_install_complete.png)

> 图片中的 delete 可以按下，是删除安装时下载的离线安装包，类似缓存

说明 ESP-IDF 的基础安装已经完成。

之后回到 VS Code，可以执行：

```text
ESP-IDF: Select Current ESP-IDF Version
```

选择刚刚安装的 ESP-IDF，例如：

```text
ESP-IDF v6.1
```

如果希望进一步检查环境，也可以执行：

```text
ESP-IDF: Doctor Command
```

用于检查 ESP-IDF、Python 环境以及相关工具是否能够被 VS Code 正确识别。

如果这一阶段没有出现错误，那么 ESP-IDF 的基础开发环境就已经基本搭建完成。

---

# 六、踩坑：EIM 使用了 Python 3.8

我的安装并没有这么顺利。

第一次安装时，EIM 报错：

```text
Failed to install Python environment:
No compatible wheel directory found for Python 3.8
```

这里最关键的信息是：

```text
Python 3.8
```

于是先检查当前终端中默认使用的 Python：

```powershell
python --version
```

得到：

```text
Python 3.8.15
```

也就是说，问题不在 ESP-IDF 本身，而在于：

> EIM 检测并使用了电脑上已有的 Python 3.8.15，而这个版本对于当前安装流程来说已经太旧。

我的 Python 3.8 实际来自 Miniconda。

---

# 七、安装 Python 3.14

既然当前 Python 版本太旧，那么最直接的思路就是另外安装一个较新的 Python。

这里我没有升级或删除原来的 Miniconda，而是安装了新版 Python Install Manager，并通过它安装：

```text
Python 3.14.7
```

安装完成后验证：

```powershell
python3.14 --version
```

得到：

```text
Python 3.14.7
```

说明新的 Python 已经正常安装。

但是继续执行：

```powershell
python --version
```

结果仍然是：

```text
Python 3.8.15
```

也就是说，此时存在一个看起来比较奇怪的情况：

```text
python3.14 → Python 3.14.7

python     → Python 3.8.15
```

Python 3.14 明明已经安装成功，但直接执行 `python` 时依然进入旧版本。

这说明问题已经不是：

> Python 3.14 有没有安装成功？

而变成了：

> Windows 执行 `python` 时，到底优先找到了哪一个 `python.exe`？

---

# 八、使用 where.exe 定位 Python

Windows 下可以使用：

```powershell
where.exe python
```

查看当前 PATH 中能够找到哪些 `python.exe`。

我的输出是：

```text
C:\Users\15255\miniconda3\python.exe
C:\Users\15255\AppData\Local\Python\bin\python.exe
```

问题到这里就非常清楚了。

Windows 执行：

```powershell
python
```

时，会按照 PATH 中目录的先后顺序查找对应的可执行文件。

我的环境中搜索顺序是：

```text
Miniconda Python 3.8
        ↓
Python 3.14
```

由于：

```text
C:\Users\15255\miniconda3\python.exe
```

排在前面，因此首先被找到。

所以：

```powershell
python --version
```

得到：

```text
Python 3.8.15
```

而 EIM 如果也是通过：

```text
python
```

来寻找 Python，那么它拿到的自然也是 Miniconda 中的 Python 3.8。

因此真正的问题不是：

> Python 3.14 没有安装成功。

而是：

> **Python 3.14 已经安装成功，但 Miniconda Python 3.8 在 PATH 中拥有更高的优先级。**

---

# 九、为什么没有直接修改 Miniconda？

发现问题以后，其实有一些非常直接的解决办法，比如：

```text
卸载 Miniconda

删除 Python 3.8

永久修改系统 PATH

修改原来的 Python 环境
```

这些方法可能都能让：

```powershell
python
```

最终指向 Python 3.14。

但我没有这么做。

原因很简单：

> 原来的 Miniconda 和 Python 3.8 可能仍然被 YOLO 等已有项目使用。

如果只是为了安装 ESP-IDF，就去修改一个原本已经能够正常工作的开发环境，很可能会产生新的问题。

相比：

> “把旧环境改掉”

我更希望：

> “让两个环境同时存在，并在需要时选择正确的那个。”

因此最后采用了 **临时修改 PATH** 的方式。

---

# 十、临时修改 PATH

新安装的 Python 位于：

```text
C:\Users\15255\AppData\Local\Python\bin
```

可以在当前 PowerShell 中执行：

```powershell
$env:PATH = "$env:LOCALAPPDATA\Python\bin;$env:PATH"
```

这条命令的作用，可以简单理解为：

> 把 Python 3.14 所在的目录临时放到当前 PowerShell 的 PATH 最前面。

于是搜索顺序从：

```text
Miniconda Python 3.8
        ↓
Python 3.14
```

变成：

```text
Python 3.14
        ↓
Miniconda Python 3.8
```

再次检查：

```powershell
python --version
```

此时就可以得到：

```text
Python 3.14.7
```

这里最重要的一点是：

> `$env:PATH` 修改的是当前 PowerShell 进程中的环境变量，而不是永久修改 Windows 的系统环境变量。

也就是说：

```text
当前 PowerShell
└── Python 3.14 优先
```

但关闭这个 PowerShell 后，重新打开一个终端，原来的系统 PATH 依旧保留。

因此 Miniconda 和已有项目不会因为这次操作被永久修改。

---

# 十一、从当前 PowerShell 启动 VS Code

这里只修改 PowerShell 的 PATH 还不够。

因为：

```powershell
$env:PATH = ...
```

只作用于当前 PowerShell 以及它启动的子进程。

如果修改完成后，直接重新从桌面图标启动一个 VS Code，新打开的 VS Code 不一定能够继承刚刚修改过的临时 PATH。

因此应该直接从当前 PowerShell 启动 VS Code：

```powershell
code --profile "ESP32"
```

这样：

```text
PowerShell
│
│ Python 3.14 优先
│
▼
VS Code ESP32 Profile
│
▼
ESP-IDF Extension
│
▼
EIM
```

VS Code 是当前 PowerShell 启动出来的子进程，因此会继承当前 PowerShell 的环境变量。

如果还希望直接打开当前目录，可以使用：

```powershell
code . --profile "ESP32"
```

这里真正重要的不是 `code .`，而是：

> **从已经修改好 PATH 的 PowerShell 中启动 VS Code。**

重新打开 EIM 并进行安装以后，这一次 Python 环境能够正常建立，最终显示：

```text
Installation Complete!
```

ESP-IDF 安装成功。

---

# 十二、最终的环境结构

最后，我的开发环境大致变成：

```text
Windows
│
├── VS Code
│   │
│   ├── 原有开发 Profile
│   │   └── YOLO / Python / C++ 等
│   │
│   └── ESP32 Profile
│       └── ESP-IDF Extension
│
├── Miniconda
│   └── Python 3.8.15
│       └── 原有项目继续使用
│
├── Python Install Manager
│   └── Python 3.14.7
│
└── D:\Espressif
    └── ESP-IDF v6.1
        └── ESP-IDF 相关工具链和环境
```

这里几个东西各自负责不同层面的隔离：

```text
VS Code Profile
└── 隔离插件和 VS Code 设置

Python / Miniconda
└── 保留不同 Python 开发环境

ESP-IDF
└── 独立保存 ESP32 开发所需工具
```

这样做的好处是：

> 学习 ESP32 不需要破坏原来已经能够正常工作的 YOLO、Python 或其他开发环境。

---

# 十三、总结

这次 ESP-IDF 的安装本身其实并不复杂，真正值得记录的是已有开发环境之间的冲突。

主要有几个经验。

## 1. VS Code Profile 很适合隔离不同技术栈

如果一台电脑同时使用 VS Code 开发：

```text
Python
YOLO
C / C++
STM32
ESP32
```

完全没有必要把所有插件都堆在同一个 VS Code 环境里。

给不同技术栈创建独立 Profile，会干净很多。

---

## 2. 遇到 Python 问题时，先确认自己到底在用哪个 Python

这两个命令非常有用：

```powershell
python --version
```

以及：

```powershell
where.exe python
```

前者告诉你：

> 当前 `python` 到底是什么版本。

后者告诉你：

> Windows 可以从哪些位置找到 `python.exe`，以及它们的优先顺序。

很多看起来像“Python 没安装好”的问题，本质上其实只是 PATH 优先级的问题。

---

## 3. 安装了新 Python，不代表 `python` 就会自动使用新版本

例如我这里就同时存在：

```text
python3.14 → Python 3.14.7

python     → Python 3.8.15
```

这并不矛盾。

因为操作系统最终执行哪个程序，取决于命令解析以及 PATH 搜索结果，而不是单纯取决于“电脑上安装的最新 Python 是哪个版本”。

---

## 4. 不要为了一个新环境轻易破坏已有环境

发现 Miniconda 抢占 `python` 以后，我完全可以直接删除 Miniconda 或永久调整 PATH。

但已有项目很可能依赖当前环境。

所以相比：

```text
删除旧环境
```

更合理的思路通常是：

```text
隔离不同环境
```

这次最终使用：

```text
VS Code Profile
+
独立 Python
+
临时 PATH
```

完成了 ESP-IDF 环境搭建，同时保留了原有开发环境。

---

到这里，VS Code + ESP-IDF 的基础环境已经配置完成。

接下来可以创建 ESP-IDF 官方的 `hello_world` 示例进行一次编译和烧录，用来确认工具链、串口以及开发板之间能够正常工作。

工程创建、编译和烧录相关内容就留到下一篇再继续记录。

```

这版会更聚焦：**整篇只回答“环境怎么装、为什么失败、怎么隔离解决”**，`hello_world` 只在结尾承担“下一步验证环境”的作用，不会把主题带到 ESP-IDF 工程开发上。

另外我建议你的文章标题也保留 **“环境隔离与踩坑记录”**，因为这恰恰是它区别于普通 ESP-IDF 安装教程最有价值的地方。

你更想要标题偏 **技术文档风**，还是偏 **个人踩坑记录风**？
```
