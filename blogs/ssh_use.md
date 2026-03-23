# SSH 连接入门

很多人把本地代码推到 GitHub 时，都会有“连接不上 gthub ”或者“push 失败”。一个更方便的做法，是在自己的电脑上生成一对 SSH 密钥，然后把公钥添加到 GitHub 账户里。官方文档目前推荐优先使用 Ed25519 密钥；配置完成后，就可以用 SSH 来 clone、pull、push 仓库。

## 1. 先检查电脑里有没有现成的 SSH 密钥

打开终端，输入：

```bash
ls -al ~/.ssh
```

如果你已经看到了类似 `id_ed25519` 和 `id_ed25519.pub` 这样的文件，说明电脑里可能已经有一套 SSH 密钥；如果没有，就继续往下生成新的。

## 2. 生成一对新的 SSH 密钥

在终端输入下面这条命令，把 -c 后面换成你自己的 GitHub 邮箱：

```bash
ssh-keygen -t ed25519 -C "114514@1919.com"
```

回车之后，系统会出现
- Enter file in which to save the key (/home/usrname/.ssh/id_ed25519):

上面的意思让密钥放在什么地方，一般直接回车，为默认存放地址（C:\Users\name\.ssh）就可以了

- Enter passphrase (empty for no passphrase): 
- Enter same passphrase again: 

接着它还会让你设置一个 passphrase（密钥密码），如果你不想设的话直接跳过按 Enter 就行了，但是推荐设一个。
> 必须注意的一点是，当输入密码时，终端上不会显示，不要以为是自己没按键盘。

## 3. 把私钥加入 ssh-agent

生成完成后，再把私钥加入本机的 ssh-agent：

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

这一步的作用是让系统在你后续连接 GitHub 时自动使用这把密钥，不用每次都重新手动指定。GitHub 官方文档给出的标准流程也是先启动 ssh-agent，再把私钥加入进去。

## 4. 复制公钥，添加到 GitHub

先把你的公钥内容打印出来：

```bash
cat ~/.ssh/id_ed25519.pub
```

把终端里输出的整段内容完整复制下来。注意：**要复制的是 `.pub` 结尾的公钥，不是私钥**。然后打开 GitHub 网页，进入：

`头像 -> Settings -> SSH and GPG keys -> New SSH key`

接着给这把密钥起一个名字，比如“my computer”，把刚才复制的公钥粘贴进去，最后点击 **Add SSH key**。

## 5. 测试 SSH 连接是否成功

添加完成后，在终端执行：

```bash
ssh -T git@github.com
```

第一次连接时，你可能会看到一条提示，大意是问你是否信任 `github.com`。输入：

```bash
yes
```

如果配置成功，终端通常会返回一条欢迎信息，里面会带上你的 GitHub 用户名，说明 SSH 连接已经打通。GitHub 官方文档也是用这条命令来测试 SSH 是否可用。

> Hi name! You've successfully authenticated, but GitHub does not provide shell access. 

## 6. 以后怎么用 SSH 方式连接 GitHub

如果你是**新克隆仓库**，直接使用 SSH 地址：

```bash
git clone git@github.com:YOUR_NAME/YOUR_REPO.git
```

如果你本地已经有项目，只是之前用的是 HTTPS 地址，也可以改成 SSH：

```bash
git remote set-url origin git@github.com:YOUR_NAME/YOUR_REPO.git
git remote -v
```

看到 `origin` 变成 `git@github.com:...` 这种格式，就说明改成功了。GitHub 官方文档说明远程仓库既可以使用 HTTPS URL，也可以使用 SSH URL；已经存在的远程地址也可以通过 `git remote set-url` 从 HTTPS 切换到 SSH。

## 7. 公钥和私钥有什么区别？

很多人第一次接触 SSH 时，最容易搞混的就是公钥和私钥。

可以简单理解成这样：

### 私钥（private key）

私钥就是你电脑里最重要的那把“钥匙”，一般是：

```bash
~/.ssh/id_ed25519
```

它的特点是：

* **只能自己保存**
* **绝对不能发给别人**
* **也不要上传到网盘、代码仓库或者聊天群里**
* 如果别人拿到了你的私钥，就有可能冒充你登录相关服务

所以私钥就像你家门钥匙本体，不要随便乱分发。

### 公钥（public key）

公钥一般是：

```bash
~/.ssh/id_ed25519.pub
```

它的特点是：

* 可以公开给别人
* 可以添加到 GitHub、服务器、云主机等平台
* 用来告诉对方：“以后见到和这把私钥配对的人，就允许他登录”

所以公钥更像是“门锁的信息”，可以交给平台保存。

---

## 8. SSH 除了连接 GitHub，还有什么用途？

很多人第一次接触 SSH，是因为要连 GitHub。（比如说我）但实际上，SSH 的用途远不止这个。

### 1）远程登录服务器

这是 SSH 最经典的用途。比如你有一台云服务器，可以直接用 SSH 登录：

```bash
ssh username@server_ip
```

这样你就能像坐在服务器面前一样操作它。

### 2）传输文件

SSH 还可以配合 `scp` 或 `rsync` 来安全传文件。

例如：

```bash
scp test.txt username@server_ip:/home/username/
```

这条命令可以把本地文件传到远程服务器或者树莓派之类的东西。

### 3）连接其他 Git 平台

除了 GitHub，像 GitLab、Gitee 等代码托管平台，也都支持 SSH 连接。配置方法和 GitHub 类似，基本都是“生成密钥 -> 上传公钥 -> 测试连接”。

### 4）连接树莓派

SSH 还有一个很常见的用途，就是**远程连接树莓派**。

比如你装好树莓派系统之后，很多时候并不会专门给它接显示器、键盘和鼠标，而是让它直接连上家里的网络，然后在自己电脑上通过 SSH 远程操作它。

常见命令如下：

```bash
ssh pi@raspberrypi.local
````

或者如果你知道树莓派的 IP 地址，也可以这样连接：

```bash
ssh pi@192.168.1.100
```

这里的 `pi` 是用户名，后面的 `raspberrypi.local` 或 IP 地址就是树莓派在局域网里的位置。

连接成功之后，你就可以在自己电脑的终端里直接操作树莓派，比如：

* 安装软件
* 部署小项目或小网站
* 查看日志和系统状态

> 如果树莓派开启了 SSH 服务，并且和你的电脑在同一个网络下，一般就可以直接连接。但是可能找 ip 可能会令人红温，这里推荐使用 nmap 。

> 如果连不上，通常要先检查 SSH 是否已经启用，以及 IP 地址是否正确。

---

## 结尾

总的来说，使用 SSH 连接 GitHub 可以理解成三步：

1. 在自己电脑上生成一对密钥
2. 把公钥添加到 GitHub 账户
3. 用 SSH 地址来连接仓库

配好之后，后面写代码、提交、推送都会顺手很多，尤其是推送代码时。虽然第一次配置看起来有点麻烦，但其实做完一遍，以后基本就不用再折腾了。
