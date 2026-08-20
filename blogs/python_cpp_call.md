# Python 和 C++ 的互相调用

## 前言

学了一段时间之后，你大概率会听到这种说法：

> Python 写起来快，跑起来慢；C++ 写起来慢，跑起来快。

于是很多人就觉得这两门语言是"二选一"的关系。

但其实不是，它们完全可以**互相调用**，各干各擅长的事：

- **Python 调用 C++**：让 Python 里跑 C++ 的高性能代码
- **C++ 调用 Python**：让 C++ 程序拥有脚本能力

其中"Python 调用 C++"我会重点讲**子进程 + 标准输出**这种方式，因为这是我在自己项目（[PI_CAR](https://github.com/Wang-yifan666/PI_CAR)）里实际在用的，后面再补充 `ctypes` 和 `pybind11` 两种经典方式。

---

## 方向一：Python 调用 C++

### 方式 1：子进程 + 标准输出（我最常用）

先说我项目里真实在用的方案。

`PI_CAR` 是一个树莓派巡逻车项目，主程序是 Python，但视觉检测用的是 C++（NCNN 推理）。它们之间**不是**靠 `ctypes` 或 `pybind11` 绑定，而是：

> C++ 编译成一个独立的可执行文件，Python 用 `subprocess` 把它启动起来，然后一直读它的标准输出。

先记住这样做的三个好处，后面会展开：

* 语言彻底解耦：C++ 就是一个独立 exe，Python 只负责"启动 + 读结果"
* 崩溃隔离：C++ 崩了，Python 主程序还活着，检测到之后重启它就行
* 适合长驻服务：检测器要一直跑，结果源源不断地从 stdout 流出来

#### C++ 侧：持续往 stdout 输出 JSON

C++ 这边是一个 `while(true)` 长驻进程，每处理完一帧就往标准输出打一行 JSON：

```cpp
// detector.cpp —— 长驻检测进程，持续往 stdout 输出 JSON
#include <iostream>
#include <chrono>

static double now_ms() {
    using namespace std::chrono;
    return (double)duration_cast<milliseconds>(
        steady_clock::now().time_since_epoch()).count();
}

int main() {
    int frame_id = 0;

    while (true) {
        // 这里省略真正的 NCNN 推理，只演示"怎么把结果交给 Python"
        double x = 1.0 * frame_id;
        double y = 2.0 * frame_id;

        std::cout << "[ NCNN ]"
                  << "{\"ts\":" << now_ms()
                  << ",\"frame_id\":" << frame_id
                  << ",\"detections\":[{\"x\":" << x
                  << ",\"y\":" << y << "}]}"
                  << "\n";
        std::cout.flush();   // 关键：立刻刷出去，别让 Python 干等

        ++frame_id;
    }
    return 0;
}
```

几个要点：

* `[ NCNN ]` 是我自己定的**协议前缀**，Python 只认带这个前缀的行，其他杂七杂八的输出直接忽略
* 后面紧跟一个 JSON，这样 Python 端一个 `json.loads` 就能解析
* `std::cout.flush()` 很重要——不加的话，输出会被缓冲，Python 可能要等很久才收到一行

编译成一个**可执行文件**（注意不是 `.dll`，也不是 `.pyd`）：

```cmake
cmake_minimum_required(VERSION 3.11)
project(detector CXX)

set(CMAKE_CXX_STANDARD 17)

add_executable(detector_ncnn detector.cpp)
```

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

#### Python 侧：启动子进程 + 读 stdout

Python 这边封装成一个 `ProcessDetector` 类：

```python
import subprocess
import json
import queue
import threading

class ProcessDetector:
    def __init__(self, exec_path):
        self.exec_path = exec_path
        self.proc = None
        self.q = queue.Queue(maxsize=200)

    def start(self):
        self.proc = subprocess.Popen(
            [self.exec_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        # 开两个后台线程分别读 stdout / stderr，避免管道写满卡死子进程
        threading.Thread(target=self._read_stdout, daemon=True).start()
        threading.Thread(target=self._read_stderr, daemon=True).start()

    def _read_stdout(self):
        for line in self.proc.stdout:
            line = line.strip()
            if not line.startswith("[ NCNN ]"):
                continue

            try:
                msg = json.loads(line[len("[ NCNN ]"):])
                if self.q.full():
                    self.q.get_nowait()   # 满了就丢掉最旧的一条，避免积压
                self.q.put_nowait(msg)
            except json.JSONDecodeError:
                pass

    def _read_stderr(self):
        for line in self.proc.stderr:
            print("[detector stderr]", line.rstrip())

    def poll(self, timeout=0.5):
        """取一条最新结果，没有就返回 None"""
        try:
            return self.q.get(timeout=timeout)
        except queue.Empty:
            return None

    def is_alive(self):
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.proc and self.is_alive():
            self.proc.terminate()
```

用法：

```python
det = ProcessDetector("./build/detector_ncnn")
det.start()

while det.is_alive():
    msg = det.poll(timeout=0.5)
    if msg:
        print(msg)

det.stop()
```

几个细节：

* **一定要开两个线程分别读 stdout 和 stderr**。如果只读 stdout 不读 stderr，子进程的 stderr 写满缓冲区就会卡住
* `queue.Queue` 起到缓冲作用，C++ 跑得快、Python 处理慢也没关系
* `is_alive()` 用来做健康检查，C++ 崩了 Python 能第一时间发现

#### 这种方式的优缺点

优点：

* **崩溃隔离**：C++ 里 NCNN 崩了、摄像头被拔了，都不影响 Python 主程序，重启子进程就行
* **调试方便**：可以先单独跑那个 exe 看输出，不用管 Python
* **语言彻底解耦**：哪天想把 C++ 换成别的语言实现，Python 这边一行都不用改

缺点：

* 有进程间通信开销（JSON 序列化 + 管道）
* 比 `pybind11` 那种"直接函数调用"慢一点

但对"每帧传一包检测结果"这种场景，这点开销完全可以忽略。真要追求极致，才考虑 `pybind11`。

#### 变体：一次性调用

如果你的需求是"跑一次 C++ 程序，拿结果"（比如跑个 benchmark），用 `subprocess.run` 更省事：

```python
import subprocess

result = subprocess.run(
    ["./build/etest_yolo_benchmark", "--model", "best.onnx"],
    capture_output=True,
    text=True,
    timeout=600,
)
print(result.stdout)
```

> 这种方式我在另一个项目 `etest_2026` 的 benchmark 脚本里也在用：Python 脚本去跑 C++ 编译出来的 benchmark 程序，再从 stdout 解析性能数据。

---

### 方式 2：ctypes（适合简单函数）

`ctypes` 是 Python 标准库自带的，**不用装任何东西**，适合"只想快速调一个 C/C++ 函数"的场景。

```cpp
// add.cpp
extern "C" __declspec(dllexport) int add(int a, int b) {
    return a + b;
}
```

```bash
clang++ -shared -o add.dll add.cpp
```

```python
import ctypes

lib = ctypes.CDLL("./add.dll")
print(lib.add(10, 20))   # 30
```

注意：

* `extern "C"` 一定不能少，否则 C++ 会做名字修饰，Python 就找不到函数了
* `__declspec(dllexport)` 是 Windows 下"把函数导出"的意思
* 适合参数简单的函数，参数类型一复杂就会写得很痛苦

---

### 方式 3：pybind11（现代绑定）

如果你要长期做"Python + C++"的项目，`pybind11` 是官方都推荐的现代 C++ 绑定库。

```bash
pip install pybind11
```

```cpp
// add.cpp
#include <pybind11/pybind11.h>

int add(int a, int b) {
    return a + b;
}

PYBIND11_MODULE(myadd, m) {
    m.def("add", &add, "两个整数相加");
}
```

```cmake
cmake_minimum_required(VERSION 3.20)
project(myadd LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)

find_package(pybind11 CONFIG REQUIRED)

pybind11_add_module(myadd add.cpp)
```

```bash
cmake -B build
cmake --build build
```

```python
import myadd
print(myadd.add(3, 4))   # 7
```

好处：

* 不用手动写 `extern "C"`
* 参数类型自动转换
* 可以直接绑定类、重载函数、STL 容器等

---

### 编译产物小结

三种方式编译出来的东西不一样，简单总结成一张表：

| 方式 | 产物（Windows） | 本质 | 怎么加载 |
| --- | --- | --- | --- |
| 子进程 | `detector_ncnn.exe` | 可执行文件 | `subprocess.Popen([...])` |
| ctypes | `add.dll` | 普通动态库 | `ctypes.CDLL("./add.dll")` |
| pybind11 | `myadd.pyd` | Python 扩展模块 | `import myadd` |

这里有个很容易搞混的点：

> `.pyd` 本质上就是 `.dll`，只是改了后缀名。

为什么改后缀？因为 Python 的 `import` 机制是**按文件后缀**来认扩展模块的：看到 `.pyd`，它才知道"这是个可以直接 import 的扩展模块"。而普通的 `.dll`，Python 不会主动去认，需要你用 `ctypes` 手动加载。

Linux 下会简单一点：`.so` 既可以被 `ctypes` 加载，也可以被 Python 当成扩展模块 import（具体看是不是按扩展模块的规则编译的）。

另外还有一个加载路径的坑：

* 子进程 / `ctypes` 加载：路径写死就行，相对路径、绝对路径都可以
* `import` 加载 `.pyd`：必须放在 `sys.path` 能找到的地方（当前目录、`site-packages`、`PYTHONPATH` 等），否则会报 `ModuleNotFoundError`

所以你 `pip install` 的那些第三方库，扩展模块基本都是装到 `site-packages` 里，这样在任何地方都能直接 `import`。

---

## 方向二：C++ 调用 Python

这个方向相对少见，但很有用。典型场景是：你有一个 C++ 主程序，想让它"能跑 Python 脚本"，比如做插件、配置逻辑，或者复用现成的 Python 生态。

Python 官方提供了一个嵌入接口，叫 **CPython API**。先上最小例子：

```cpp
// callpy.cpp
#include <Python.h>
#include <iostream>

int main() {
    Py_Initialize();

    // 直接执行一段 Python 代码
    PyRun_SimpleString("print('hello from python')");

    Py_Finalize();
    return 0;
}
```

编译时需要带上 Python 的头文件和库（版本号按你自己装的改）：

```bash
clang++ callpy.cpp -I"C:\Python311\include" -L"C:\Python311\libs" -lpython311 -o callpy.exe
```

运行后就会打印出：

```text
hello from python
```

如果只是打印一句话，那确实没什么意思。更常见的是"调用 Python 里定义的函数"，大概长这样：

```cpp
#include <Python.h>
#include <iostream>

int main() {
    Py_Initialize();

    // 先执行一段脚本，定义一个函数
    PyRun_SimpleString(
        "def add(a, b):\n"
        "    return a + b\n"
    );

    // 拿到主模块里的 add 函数
    PyObject* module = PyImport_AddModule("__main__");
    PyObject* func   = PyObject_GetAttrString(module, "add");

    // 构造参数 (3, 4) 并调用
    PyObject* args   = PyTuple_Pack(2, PyLong_FromLong(3), PyLong_FromLong(4));
    PyObject* result = PyObject_CallObject(func, args);

    std::cout << "result = " << PyLong_AsLong(result) << "\n";

    // 记得释放引用
    Py_DECREF(args);
    Py_DECREF(result);

    Py_Finalize();
    return 0;
}
```

> C++ 调 Python 的 API 写起来比较啰嗦，引用计数（`Py_INCREF` / `Py_DECREF`）也容易写错，所以一般只在"确实需要脚本能力"时才用。

---

## 结语

总结一下怎么选：

* 想让 Python 跑 C++ 的**长驻服务**（比如实时检测）→ **子进程 + 标准输出**，解耦又抗崩
* 只想快速调几个**简单函数** → `ctypes`
* 要长期做绑定、追求**极致性能** → `pybind11`
* 想让 C++ 程序能跑脚本、复用 Python 生态 → **CPython API**

这两个方向本质上是同一件事：让"好写的"和"好跑的"互相配合。多写多试，一切都会好起来的（确信）

PS：文中的子进程方案就是 [PI_CAR](https://github.com/Wang-yifan666/PI_CAR) 的真实写法，benchmark 那种一次性调用在 [etest_2026](https://github.com/Wang-yifan666/etest_2026) 里也有用到，感兴趣可以去看看。
