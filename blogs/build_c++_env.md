# 在 Win11 上构建现代 C++ 开发环境

## 前言

我发现很多人的电脑还在使用 dev-c++ 来做一些项目，这令我大为恼火，所以写下这篇 blog 来帮助大家完成对现代 C++ 环境的配置(我比较喜欢使用的一套)，用到的工具有 :

* **Mingw**
* **CMake**
* **clangd**
* **Ninja**
* **VSCode**
* **Git**
* **clang-format**
* **Vcpkg**

---

## 工具的安装

### 1.我们先下载 `git` 

git是什么我们先不管，你只需要知道这是管理代码版本的软件，他可以像游戏管理不同存档一样管理你的代码版本
去git的官网（记住了，别tm用电脑应用商店，我真求了）下载一个最新版的就行了。

> https://git-scm.com/downloads

下载下来的东西应该是一个exe ，一般一直默认就可以了。（应该会默认加入环境变量）

完成后，可以打开命令行（同时按下 win + R ）输入以下指令检查是否成功
```
git --version
```
成功应该会出现类似结果（如果失败了，到第二步一起加入环境变量）
```
git version 2.50.1.windows.1
```

### 2.下载 `vscode`

 vscode 全称是 ~~微软大战代码~~ Visual Studio Code，这其实并不重要，这是一个代码编辑器 ，就像你电脑里的 dev－c++ ， 是地球上最多人使用的代码编辑器 ，有着非常多活跃的社区，非常多的插件。

你也可以直接去官网下载 vscode 

> https://code.visualstudio.com/

安装完成后，你先点击左侧的插件，搜索 Chinese ，先安装中文插件，其他的插件等会再安装。
(不过据说现在最新版的vscode自己有汉化，不知道真的假的)

### 3.下载 `CMake`
CMake 是什么呢？好问题！
CMake是帮助我们编译文件的，这边建议你单独去学习一下，非常有用，可以避免我们写什么
```
g++ src/head.cpp src/main.cpp -o hello
```
CMake 本身并不直接编译代码，它更像是一个“构建系统生成器”。它可以生成 Ninja、Makefile、Visual Studio 工程等构建文件，然后再由真正的构建工具去完成编译。

同样可以直接在官网下载并安装。
> https://cmake.org/download/

安装时勾选下面的选项（或者类似的）
```
Add CMake to the system PATH
```

安装完成后，打开终端输入：
```
cmake --version
```
如果能看到版本号，就说明 CMake 安装成功了。


### 4.下载 `Mingw`
Mingw 是一个完整的工具链，来实现完整的编译过程，如果你不知道编译过程是什么的话，自行去搜索一下（或者我以后写篇blog谈谈）。

我建议使用 LLVM-MinGW ，过程最简单。LLVM-MinGW 可以简单理解成：

```
LLVM / Clang + MinGW-w64
```
它使用 clang++ 作为 C++ 编译器，同时借助 MinGW-w64 的运行时和头文件，在 Windows 上生成 .exe 程序。

在下面网站下载
> https://github.com/mstorsjo/llvm-mingw/releases

比如你是 64 位的 win11 电脑就下载如下的内容
```
llvm-mingw-日期-ucrt-x86_64.zip
```

下载完解压，比如下文

```
D:\Mingw
```
 
### 5.下载`Ninja`

CMake 读取 CMakeLists.txt，生成 Ninja 所需的构建文件；Ninja 再根据这些文件执行真正的编译。
 
在下面地址下载
> https://github.com/ninja-build/ninja/releases

下载并解压完会得到一个 exe ，可以把它放到一个固定目录，比如：
```
D:\ninja\ninja.exe
```

### 6.下载clangformat

当很多人一起开发同一个项目的时候，不同的人可能会有不同的代码风格，有的人喜欢大括号不独占一行，有的喜欢独占一行，这样可能会出现混乱的风格，clangformat就是来解决这个问题的，

由于我们使用的是 LLVM-MinGW ，一般里面已经自带了 clang-format，所以不需要单独下载。

我们通过在根目录下新建一个 `.clang-format` 文件来统一代码的风格。

你可能也看到过 `.editorconfig` 这种文件，这是用来统一不同的编译器。比如说缩进大小、换行符、文件编码等。

### 7. 下载 `clangd`

`clangd` 是 C++ 的语言服务器，主要负责给 VSCode 提供代码补全、跳转定义、查找引用、错误提示等功能。

注意，`clangd` 不是编译器。

```
clang++  负责编译代码
clangd   负责代码智能提示
```

我们使用的是 **LLVM-MinGW**，通常里面已经自带了 `clangd`，所以不需要单独下载。

### 8. 下载 `vcpkg`

`vcpkg` 是一个 C/C++ 第三方库管理工具。非常好用。

写 C++ 项目时，我们经常会用到一些第三方库，比如：

```
opencv
ftxui
```

如果手动下载、编译、配置这些库，会非常麻烦。`vcpkg` 的作用就是帮我们更方便地安装和管理这些第三方库。

`vcpkg` 的下载地址是：

> [https://github.com/microsoft/vcpkg](https://github.com/microsoft/vcpkg)

安装方式也很简单，先找一个你想存放它的位置，比如：

```
D:\vcpkg
```

然后打开终端，执行：

```
git clone https://github.com/microsoft/vcpkg.git D:\vcpkg
```
(或者下载压缩包解压
> https://github.com/microsoft/vcpkg/releases 
)

进入目录：

```bash
cd /d D:\vcpkg
```

执行初始化脚本：

```bash
bootstrap-vcpkg.bat
```
执行完成后，目录下会生成：`vcpkg.exe`

---

## 加入环境变量和vscode插件安装

### 什么是环境变量

环境变量是干什么的呢？就是操作系统用来保存配置信息的一组变量。

以 Path 为例，其实就是告诉你的电脑可执行文件在哪里，一般类似 py 中的字典或是 C++ 的 unordered_map 一样存储，是一组键对值，包括名字和他所在的地址。

比如说你在终端里输入 ipconfig 有结果就是因为电脑的 path 里面有 `C:\Windows\System32` 

### 开始加入环境变量

Git 和 CMake 安装时已经自动加入了环境变量，就不需要手动添加。

所以我们需要加入的环境变量就是 `LLVM-MinGW 的 bin 目录`,`Vcpkg所在目录` 和`Ninja 所在目录`。

1. 先按下 win 键，然后在搜索栏输入 环境变量 ，会出现 `编辑系统的环境变量`打开
2. 在下部，确认键的上面有一个 `环境变量(N)...` 按钮，按下。
3. 选择下面的`系统变量`里面有一个 `Path` ，单击选中，然后点击下面的编辑。
4. 点击左侧的最上方的 `新建` 即可新建系统变量。
5. 新建将之前的`mingw里的bin目录路径`名称填进去。比如说 `D:\Mingw\bin`
6. （重要）新建好后，确认一个一个的点，三个确认一个不能少。
7. 然后再按照一样的步骤把`ninja的目录`和`vcpkg的目录`加进去（记住是目录，不是exe），应该加入：`D:\ninja`而不是：`D:\ninja\ninja.exe`

### 确认环境变量是否配置成功

现在让我们看看你成功了没有，打开一个终端，输入以下指令，如果全部是正常输出版本号，那很棒了。
```
git --version
cmake --version
clang++ --version
clangd --version
clang-format --version
ninja --version
vcpkg version
```

但是如果出现
```
不是内部或外部命令，也不是可运行的程序
```

那就说明没有加到系统变量里面。得回去检查一下。

### 关于vcpkg

vcpkg 还要补 VCPKG_ROOT

除了把 `D:\vcpkg` 加入 `Path`，还建议新建一个系统变量：

变量名：

```
VCPKG_ROOT
```

变量值：

```
D:\vcpkg
```

这样 CMake、VSCode 或其他工具就能更方便地找到 vcpkg 的根目录。

下面需要写死路径如
> C:/Users/15255/vcpkg/scripts/buildsystems/vcpkg.cmake

就可以写为
> $env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake

### 安装`vscode`的插件

打开vscode的插件，搜索下面的几个并安装
- clangd
- CMake
- CMake Tools

## 示例

---
### 1. 安装 OpenCV

```
vcpkg install opencv4:x64-mingw-dynamic
```

---

### 2. 创建项目目录

在终端里面
```
mkdir demo
cd demo
mkdir src assets
```

项目结构：

```txt
demo
├─ src
│  └─ main.cpp
├─ assets
│  └─ test.jpg
├─ CMakeLists.txt
├─ CMakePresets.json
├─ .clang-format
└─ .vscode
   └─ settings.json
```

拿一张图片，改名成：`test.jpg`

复制到 `assets` 文件夹里即可。

---

### 3. 编写 `src/main.cpp`

```cpp
#include <opencv2/opencv.hpp>
#include <iostream>

int main() 
{
    cv::Mat image = cv::imread("assets/test.jpg");

    cv::imshow("OpenCV Demo", image);

    std::cout << "Press any key on the image window to exit...\n";
    cv::waitKey(0);

    return 0;
}
```
你可以以后自己研究上面什么意思。总结一下就是打开 `test.jpg`这张图片。

---

### 4. 编写 `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.20)

project(demo LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenCV CONFIG REQUIRED)

add_executable(demo src/main.cpp)

target_link_libraries(demo PRIVATE ${OpenCV_LIBS})
```
你可以以后自己研究上面什么意思。总结一下就是用于编译一个名为 demo 的程序。

---
### 4.5 写一篇 `.clang-format`

这里你可以参考一下下一篇blog。

写完后在c++文件页面右键会出现格式化，只要点击即可。

### 5. 编写 `CMakePresets.json`

```json
{
  "version": 3,
  "configurePresets": [
    {
      "name": "vcpkg",
      "hidden": true,
      "cacheVariables": {
        // 下面换成自己的地址，然后删除这行
        "CMAKE_TOOLCHAIN_FILE": "C:/Users/15255/vcpkg/scripts/buildsystems/vcpkg.cmake",
        "VCPKG_TARGET_TRIPLET": "x64-mingw-dynamic"
      }
    },
    {
      "name": "debug",
      "inherits": "vcpkg",
      "hidden": true,
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/debug",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_EXPORT_COMPILE_COMMANDS": "ON"
      }
    },
    {
      "name": "release",
      "inherits": "vcpkg",
      "hidden": true,
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/release",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    },
    {
      "name": "windows-debug-x86_64-mingw",
      "inherits": "debug",
      "displayName": "Windows x86_64 LLVM-MinGW Debug",
      "description": "LLVM-MinGW Debug",
      "cacheVariables": {
        "CMAKE_C_COMPILER": "clang",
        "CMAKE_CXX_COMPILER": "clang++"
      }
    },
    {
      "name": "windows-release-x86_64-mingw",
      "inherits": "release",
      "displayName": "Windows x86_64 LLVM-MinGW Release",
      "description": "LLVM-MinGW Release",
      "cacheVariables": {
        "CMAKE_C_COMPILER": "clang",
        "CMAKE_CXX_COMPILER": "clang++"
      }
    }
  ],
  "buildPresets": [
    {
      "name": "windows-debug-x86_64-mingw",
      "configurePreset": "windows-debug-x86_64-mingw"
    },
    {
      "name": "windows-release-x86_64-mingw",
      "configurePreset": "windows-release-x86_64-mingw"
    }
  ]
}
```
总结一下就是告诉 CMake：使用 Ninja 作为构建工具，使用 clang/clang++ 作为编译器，并通过 vcpkg 找到 OpenCV 等第三方库。

---

### 6. 编写 `.vscode/settings.json`

```json
{
  "cmake.configureOnOpen": true,
  "cmake.copyCompileCommands": "${workspaceFolder}/compile_commands.json",
  "clangd.arguments": [
    "--compile-commands-dir=${workspaceFolder}"
  ],
  "C_Cpp.intelliSenseEngine": "disabled"
}
```
如果 clangd 没有正常识别 OpenCV 头文件，可以先执行一次 CMake 配置，确保根目录下生成了 `compile_commands.json`。

---

### 7. 构建并运行

在项目根目录执行：

```bash
cmake --preset windows-debug-x86_64-mingw
cmake --build --preset windows-debug-x86_64-mingw
.\build\debug\demo.exe
```

如果成功，你会看到一个窗口弹出，显示 `assets/test.jpg` 这张图片。

到这里说明已经ok了：

```txt
VSCode
 ↓
CMake
 ↓
Ninja
 ↓
clang++
 ↓
vcpkg
 ↓
OpenCV
 ↓
生成 exe 并成功运行
```

---

> 写于 2026.5.3