# Python `OS` 模块

## 前言

在学习 Python 自动化脚本时，`os` 模块几乎是绕不开的一部分。

很多初学者第一次接触 Python 脚本，往往就是从这些功能开始的：

- 批量重命名文件
- 移动文件到不同目录

而这些操作，很多都和 `os` 模块有关。

我会用**人类**更容易理解的方式，来看看 Python 的 `os` 模块，并把重点放在**文件和目录操作**上。

---

## `os` 模块是干什么的？ 

`os` 是 Python 的标准库模块之一，它提供了很多**和操作系统交互**的功能。

你可以把它理解成：

> 我通过写 py 代码来操作文件。

例如：

- 查看当前工作目录
- 遍历某个文件夹
- 新建目录
- 重命名文件
- 删除文件
- 拼接路径

这些事情都可以通过 `os` 完成。

---

## 先导入 `os`

使用前，肯定要先导入模块：

```python
import os
```

---

## `os` 最常见的使用场景

在文件操作里，`os` 常见用途主要有这几类：

* 获取当前工作目录
* 遍历目录
* 判断文件或目录是否存在
* 创建目录
* 重命名文件
* 删除文件
* 拼接路径

下面我们一个一个看。

---

## 1. 获取当前工作目录

当前工作目录，就是你的 Python 脚本运行时默认所处的位置。

```python
import os

print( os.getcwd() )
```

输出示例：

```python
D:\hahah\os_learn
```

为什么需要这个函数？
- 因为你写相对路径是根据当前文件目录来计算的。例如你写：

```python
open("test.txt")
```

Python 会默认去**当前工作目录**里找这个文件。

---

## 2. 查看目录中的内容：

如果你想看看某个文件夹里有哪些文件，可以用：

```python
import os

files = os.listdir("data")
print(files)
```

假设 `data` 文件夹里有这些内容：

```python
['a.txt', 'b.jpg', 'c.md']
```

### 特点

* 返回的是一个列表
* 列表里是名称字符串
* 不知道是文件还是目录

---

## 3. 判断文件或目录是否存在

这是使用非常非常频繁的操作。

### 判断路径是否存在

```python
import os

print( os.path.exists("data") )
```

如果存在，返回：

```python
True
```

### 判断是不是文件

```python
import os

print( os.path.isfile("data/a.txt") )
```

### 判断是不是目录

```python
import os

print( os.path.isdir("data") )
```

这几个函数的用法非常明显，就不过多介绍了。

---

## 4. 拼接路径：`os.path.join()`

字面意思：把路径拼接起来。

```python
import os

path = os.path.join("data", "test.txt")
print(path)
```

但其实也可以写成如下的：

```python
path = "data/" + "test.txt"
```

但是由于win和linux的分隔符('/' 和 '\')不同，更建议使用 join() .

---

## 5. 创建目录：`os.mkdir()` 和 `os.makedirs()`

### 创建单层目录

```python
import os

os.mkdir("new_folder")
```

如果目录已存在，会报错。

---

### 创建多层目录

```python
import os

os.makedirs("a/b/c")
```

这适合一次性创建多级目录。

如果你希望“目录已存在时不报错”，可以这样写：

```python
import os

os.makedirs("a/b/c", exist_ok=True)
```

---

## 6. 重命名文件：`os.rename()`

这是一个常用的函数。

### 单个文件重命名

```python
import os

os.rename("data/old_name.txt", "data/new_name.txt")
```

这行代码的含义是：

* 把 `data/old_name.txt`
* 改名为 `data/new_name.txt`

---

### 重命名的本质

重命名其实可以理解为：

> 把旧路径改成新路径。

如果旧路径和新路径在同一个目录，就是“改名”。

如果旧路径和新路径不在同一个目录，效果上就可能变成“移动”。

例如：

```python
import os

os.rename("data/test.txt", "backup/test.txt")
```

这在很多情况下就相当于把文件移到 `backup` 目录。
（虽然我知道这很诡异，但确实可以这样）
---

## 7. 删除文件：`os.remove()`

如果你想删除一个文件：

```python
import os

os.remove("data/test.txt")
```

但是，删除前最好先判断文件是否存在

更好的写法：

```python
import os

file_path = "data/test.txt"

if os.path.exists(file_path):
    os.remove(file_path)
    print("文件已删除")
else:
    print("文件不存在")
```

---

## 8. 删除空目录：`os.rmdir()`

删除空目录可以用：

```python
import os

os.rmdir("empty_folder")
```

注意：

* 只能删除**空目录**
* 如果目录里还有内容，会报错

如果要删除非空目录，通常会使用 `shutil.rmtree()`，这个属于另一个模块 `shutil` 的功能。或者遍历整个目录（见下），然后逐个删除文件。

---

## 9. 遍历目录：`os.walk()`

如果你不只是想看当前目录，而是想把**整个目录**都遍历一遍，可以用 `os.walk()`。

```python
import os

for root, dirs, files in os.walk("data"):
    print("当前目录:", root)
    print("子目录:", dirs)
    print("文件:", files)
    print("-" * 30)
```

### 它会返回三个值：

* `root`：当前遍历到的目录路径
* `dirs`：当前目录下的子目录名列表
* `files`：当前目录下的文件名列表

这是一个非常好用的工具。

---

## 10. 获取文件名、扩展名、目录名

`os.path` 提供了很多路径拆解工具。

### 获取文件名

```python
import os

path = "data/report.txt"
print(os.path.basename(path))
```

输出：

```python
report.txt
```

---

### 获取目录名

```python
import os

path = "data/report.txt"
print(os.path.dirname(path))
```

输出：

```python
data
```

---

### 拆分文件名和扩展名

```python
import os

path = "data/report.txt"
name, ext = os.path.splitext(path)

print(name)
print(ext)
```

输出：

```python
data/report
.txt
```

这个在批量重命名时非常有用，因为你经常需要：

* 保留原扩展名
* 只修改主文件名

---

## 结语

`os` 模块本身并不难，只要多写，一切都会好起来的（确信）

PS：实际操作前建议先不要直接删除文件什么的，可以先测试一下，而且，记得备份
> 这都是血的教训.

[Wang-yifan666/Python_tools](https://github.com/Wang-yifan666/Python_tools)
这是几个我写的 py 脚本,可以看看,顺便给我点点 stars .
