# 一次断电引发的连环故障

## 前言

我有一台树莓派5。平时放在那里当作服务器之类的使用。

事情发生在放假期间。放假时这台树莓派就出过一次意外断电，我当时懒得当场处理，干脆把它关机了；假期结束回来一开机，发现**彻底登不上了**。

于是就有了下面这一长串：先确认问题到底出在哪，再想办法在完全没有登录权限的情况下拿到一个能执行命令的地方，好不容易修好登录之后，又接连冒出桌面黑屏、包管理失效、某个服务崩溃、swap 起不来 —— 前前后后一共坏了五个地方。

---

# 第 1 步 · 发现登不上

那是一台平时只用 SSH 管理的树莓派，跑着一个QQ群聊里的机器人，很少接显示器。国庆的时候机器人上的QQ不小心掉线了，我写了一个邮件警告我，我就顺手把它关了；假期结束准备把QQ登录起来，发现连接不上，通过webui登录后发现机器人的服务恢复了，但是ssh还是连接不上：

```text
wangyifan@<树莓派IP>: Permission denied (publickey,password).
```

我觉得很奇怪，还怀疑过是不是我密码记错了（查了密码本），或者被人爆破了（没有暴露在公网IP下）

> 所以现在我们回头看就会发现，这台机器其实是**关机的时候就坏了**，只不过一直没开机。

---

# 第 2 步 · 接上显示器，准备看看怎么回事

既然 SSH 进不去，我就去把显示器接上，准备直接用终端看看是什么情况。

**But**，屏幕上只有这么几行：

```text
Debian GNU/Linux 13 wangyifan tty1

My IP address is <树莓派IP> fe80::c915:b93f:8f5b:fca6

wangyifan login: wangyifan (automatic login)

Authentication failure
```

我的树莓派平时应该是**免密自动登录**的，现在连自动登录都进不去。

---

# 第 3 步· 我没招了

到这里，我已经完全不知道怎么回事了，只能求助于GPT-6大人了，（以下很多都是GPT的思考过程）

先用 `-vv` 把握手过程打出来：

```bash
$ ssh -vv -o PreferredAuthentications=password wangyifan@<树莓派IP> exit
debug1: Connection established. 
debug1: Remote protocol version 2.0, remote software version OpenSSH_10.0p2 Debian
debug1: kex: host key algorithm: ssh-ed25519
debug1: Server host key: ssh-ed25519 SHA256:LG2LWea...Mfs
debug1: Authentications that can continue: publickey,password
wangyifan@<树莓派IP>: Permission denied (publickey,password).
```

这一步确认了两件事：机器是原来那台（主机密钥和 `known_hosts` 里记录的逐字节一致），网络没问题。

再看看ssh

```bash
$ ssh -o PreferredAuthentications=password nosuchuser_zzz@<树莓派IP> exit
nosuchuser_zzz@<树莓派IP>: Permission denied (publickey,password).
```

**用户不存在、密码错误、被策略拒绝，客户端看到的字面输出完全相同。** 我真的没招了。

---

# 第 4 步 · 再看看显示器

回到显示器那几行字。GPT发现了两个线索。

## 线索一：`(automatic login)` —— 连不看密码的那条路都断了

`agetty` 的字符串表里有 `%s%s (automatic login)` 这个格式串，说明这是 `agetty --autologin` 打印的提示，而它内部执行的是 **`login -f`**。翻 util-linux 的源码 `login.c`：

```c
	/* login -f, then the user has already been authenticated */
	cxt.noauth = cxt.noauth && getuid() == 0 ? 1 : 0;

	if (!cxt.noauth)
		loginpam_auth(&cxt);   
	/*
	 * Authentication may be skipped ..., but it doesn't mean that we can
	 * skip other account checks.  The account could be disabled or the
	 * password has expired ...
	 */
	loginpam_acct(&cxt);       
```

**结论很直接：这条路压根不看密码，现在也断了 → 不是密码的问题。**

## 线索二：`Authentication failure` 是 PAM 报的，而且来自"账户阶段"

继续往下挖。`/bin/login` 这个二进制里**没有** `Authentication failure` 这个字面量，只有 `Login incorrect`；而 `libpam.so` 里有 —— 它正是 **`PAM_AUTH_ERR` 的 `pam_strerror()`** 结果。

打印它的函数长这样（注意那个前导换行，和屏幕上的空行完全对得上）：

```c
static void loginpam_err(pam_handle_t *pamh, int retcode) {
    const char *msg = pam_strerror(pamh, retcode);
    if (msg) {
        fprintf(stderr, "\n%s\n", msg);   /* ← "\n%s\n" */
        syslog(LOG_ERR, "%s", msg);
    }
```

再看 Debian 默认的 `common-account`：

```text
account  [success=1 new_authtok_reqd=done default=ignore]  pam_unix.so
account  requisite                                        pam_deny.so    ← 永远返回 PAM_AUTH_ERR
account  required                                         pam_permit.so
```

**`pam_unix` 在账户阶段返回任何错误，都会被 `default=ignore` 放行到下一行，再被 `pam_deny` 统一"翻译"成 `PAM_AUTH_ERR`。** 所以屏幕上永远只有一句笼统的 `Authentication failure`。

> 此时结论：**问题在树莓派本机的认证链路，而且是"账户检查"阶段被拒，不是密码。**

---

# 第 5 步 · 列一张可能原因

方向有了，但"账户检查被拒"能对应很多种原因。于是我把能想到的可能性全列出来，再逐条找证据 —— 有些能在协议层直接排掉，有些必须上机看文件才能排。

## 5.1 密码与账号本身

| 可能性 | 判断 | 依据 |
| --- | --- | --- |
| 密码输错了 | 排除 | 自动登录（`login -f`）**根本不看密码**，也一样失败 |
| 密码被别人改过 | 排除 | 同上 —— 改密码不会让"不看密码"的登录失败 |
| 密码被 lock（hash 前加 `!`） | 排除 | 账户检查阶段同样不看那个 hash |
| **密码过期**（password aging） | 排除 | 协议层证据，见下 |
| 账号被设为过期（`chage -E`） | 无法排除 | 它走账户阶段，现象完全相同 |

"密码过期"这条排除得比较干净：**如果密码过期，OpenSSH 不会简单拒绝，而是回一个 `SSH2_MSG_USERAUTH_PASSWD_CHANGEREQ(60)`**，提示客户端去改密码。

GPT又翻了 paramiko 的源码 —— 它的 handler 表里**根本没有 60 号消息**，收到只会打一句 `Oops, unhandled type 60`，然后一直等到 socket 超时：

```python
def _client_handler_table(self):
    return {
        MSG_SERVICE_ACCEPT: ...,
        MSG_USERAUTH_SUCCESS: ...,
        MSG_USERAUTH_FAILURE: self._parse_userauth_failure,
        MSG_USERAUTH_BANNER: self._parse_userauth_banner,
        MSG_USERAUTH_INFO_REQUEST: self._parse_userauth_info_request,
    }
    # 没有 MSG_USERAUTH_PASSWD_CHANGEREQ
```

而实测是 **1.82 秒就明确失败**，日志是 `Authentication (password) failed.` —— 服务端回的是标准的 `USERAUTH_FAILURE`。

## 5.2 sshd 与认证策略

| 可能性 | 判断 | 依据 |
| --- | --- | --- |
| `PasswordAuthentication no` | 排除 | 服务端明确 advertise `password` 这一种方式 |
| `AllowUsers` / `DenyUsers` / `Match User` | **协议层无法排除** | 就是第 4 步那个对照实验的结论 |

## 5.3 机器与系统环境

| 可能性 | 判断 | 依据 |
| --- | --- | --- |
| 换了台机器 | 排除 | 主机密钥逐字节一致 |
| 网络问题 | 排除 | TCP 通、密钥交换成功 |
| 账号被临时锁定 / `pam_faillock` | 排除 | 第 2 步已经证明"第一次就失败" |
| 磁盘满 | 排除 | 53G 用 13G（26%），inode 使用 7% |
| 根分区被挂成只读 | 排除 | 正常启动时是 `rw` |
| **OverlayFS 导致重启回滚** | 排除 | 见下 |
| PAM 模块缺失或损坏 | 排除 | 关键模块 + `libpam` 全部完好、时间戳一致 |
| `/etc/nologin` 存在 | 排除 | `/etc/nologin` 和 `/run/nologin` 都不存在 |
| **文件系统被断电损坏** | 完全符合 | 但一开始我把它排得挺靠后 |

**OverlayFS 那条**的排除过程值得记一下：这个假设能很自然地解释"开机之后密码就不对了"（运行时的修改重启就没了）。但树莓派开关它会写进 `cmdline.txt`：

```text
console=serial0,115200 console=tty1 root=PARTUUID=... rootfstype=ext4 \
fsck.repair=yes rootwait quiet splash plymouth.ignore-serial-consoles ...
```

**既没有 `overlayroot`，也没有 `init=`**，而且这个文件的修改时间还是刷机那天 —— 从没被开过。逻辑上也不成立：回滚只丢失"运行时改过的东西"，而我从没改过密码。

## 5.4 会不会是我自己改坏的？

因为这台机器平时有一个DSH做部署，所以这条也必须查。做法是把**在项目目录之外写过的每一个文件**列出来审计：

```text
/etc/sudoers.d/xxx                 (mode 440)
/etc/systemd/system/xxx.service
/etc/systemd/system/xxx.timer
```

一共只有这三个。再对全部部署脚本 grep 一遍账号相关操作：

```bash
grep -rE '\b(passwd|usermod|chage|useradd|deluser|authorized_keys|faillock)\b' 部署脚本/
```

**这三个文件都不可能影响 sshd 的密码认证。**

---

# 第 6 步 · 试试`systemd.run=`

systemd 支持从内核命令行直接跑命令：

```text
systemd.run="/bin/bash /boot/firmware/zz_diag.sh"
```

按官方 man page（[systemd-run-generator](https://manpages.debian.org/testing/systemd/systemd-run-generator.8.en.html)），它会生成一个 `kernel-command-line.service`，默认 `SuccessAction=exit`、`FailureAction=exit` —— **命令跑完系统就自动关机**，看起来非常适合无人值守的诊断。

于是GPT写了一个脚本进引导分区，改好 `cmdline.txt`，插卡开机，等它自己出报告、自己关机。

**结果陨落了**：脚本完全没有运行，就像没这回事。

事后推测：生成出来的服务可能在 `/boot/firmware` 挂载完成之前就去执行 `/bin/bash` 了，找不到脚本直接失败；而默认的 `exit` 动作在真实机器上是个 no-op —— 所以既没报告、也没关机、也没留下痕迹。

白折腾了。

---

# 第 7 步 · 第二次尝试：`init=/bin/bash`（成功）

GPT大手子于是换了一条**不依赖 systemd** 的路。

内核参数 `init=` 指定的是 **PID 1**。写成 `/bin/bash`，内核启动的第一个进程就是 bash，**而且身份是 root** —— `getty`、`login`、PAM、密码校验**全都不存在**：

```text
# /boot/firmware/cmdline.txt 末尾追加
init=/bin/bash
```

> 其实理论上还可以用wsl直接读取卡里的内容，看看有什么问题，但是由于wsl不能读取读卡器，所以不行，所以理论上来说一台linux电脑可以恨到的解决问题。

为什么它比 `systemd.run=` 可靠：不经过 systemd、不经过生成器、不需要解析引号、不需要文件的执行位 —— **内核直接 exec，中间没有任何环节可以出错**。

于是整个操作简化成开机后的一行命令：

```bash
# 此时已经是 root shell，不需要登录
mount -t vfat /dev/mmcblk0p1 /mnt;/bin/bash /mnt/zz_diag.sh
```

---

# 第 8 步 · 找到该死的原因了

报告出来的第一眼就看到了答案：

```text
-- raw /etc/shadow line, every field except the hash --
awk: cannot open "/etc/shadow" (No such file or directory)
-- users listed in /etc/shadow --
cut: /etc/shadow: No such file or directory
-- chage -l wangyifan --
chage: the shadow password file is not present
```

**`/etc/shadow` 这个文件根本不存在。** 答案出现了。

- `pam_unix` 在认证阶段拿不到用户条目 → 手动登录报 `Login incorrect`；
- `pam_unix` 在账户阶段同样失败 → 被 `pam_deny` 兜成 `PAM_AUTH_ERR` → 自动登录报 `Authentication failure`；
- sshd 两个阶段都失败 → `Permission denied (publickey,password)`；
- **而系统照常启动、服务照常以这个用户身份运行** —— 因为 `/etc/passwd` 是好的，用户名解析没问题。

所以表面看"机器一切正常"，实际上只是**所有需要密码的入口都断了**。

## 为什么它会消失

`shadow` 工具更新密码文件用的是**三步改名**：

```text
1. 新内容写入 /etc/nshadow
2. rename(/etc/shadow  →  /etc/shadow-)     ← 旧文件被挪成备份
3. rename(/etc/nshadow →  /etc/shadow)      ← 新文件就位
```

**如果在第 2 步和第 3 步之间断电，结果就是：`/etc/shadow` 消失，而 `/etc/shadow-` 里躺着那份完好的旧文件。**

报告里还有一条旁证：`/etc/.pwd.lock` 这个锁文件还在 —— 它是更新密码库时创建的，因为那次操作没跑完，所以一直没被删掉。

**所以真正的根因是：那次意外断电，正好打断了一次密码库更新。**

> 这谁绷得住。

---

# 第 9 步 · 恢复影子文件，重启

原因搞清楚了，修起来反而最省事 —— 那份完好的备份就躺在旁边：

```bash
ls -l /etc/shadow-        # -rw-r----- 1 root shadow 980 Jun 18 08:32   ← 完好
cp -p /etc/shadow- /etc/shadow
chown root:shadow /etc/shadow
chmod 640 /etc/shadow
```

同时把一起丢掉的 `/etc/gshadow` 从 `/etc/group` 重建：

```bash
awk -F: '{ printf "%s:!::", $1; if (NF >= 4) printf "%s", $4; printf "\n" }' /etc/group > /etc/gshadow
```

恢复后逐项确认：

```text
getent shadow wangyifan → hash_len=73 lstchg=20622 max=99999   ← NSS 能解析了
passwd -S wangyifan     → P 2026-06-18 0 99999 7 -1            ← 密码有效、永不过期
chage -l wangyifan      → Password expires: never
```

**然后重启 —— 能登录了。**

> **`/etc/shadow-` 这份"上一版备份"这次救了命。** 它平时毫无存在感，但在"文件被改名过程中断"这种场景里，它就是唯一完好的副本。同理还有 `/etc/passwd-`、`/etc/group-` —— 别顺手当垃圾清理掉。

---

# 第 10 步 · 剩下的就交给 agent 了

登录一恢复，SSH 立刻就能用了 —— **后面的事情一下子简单很多：我直接把机器交给 agent，让它通过 SSH 连上去，把剩下的问题一个个查出来、修掉。**

本以为只是 `/etc/shadow` 一个文件的事。结果那次断电一共弄坏了五个地方，表面看毫不相干，根都是同一个：

| 症状 | 真正的原因 | 怎么修的 |
| --- | --- | --- |
| 所有登录入口失效 | `/etc/shadow` 被 rename 走，新文件没就位 | 从 `/etc/shadow-` 恢复 |
| 桌面黑屏、只剩一个光标在闪 | 某个共享库内容损坏（连 ELF 头都无效了） | 重装对应的库 |
| `apt` 完全不能用 | `rm` 等文件丢失 —— **而 apt 自己就依赖 `rm`** | 绕过 apt，直接从 `.deb` 里抠文件补回去 |
| 某个服务一启动就段错误 | 第三方包里的文件内容损坏 | 按**原版本**重装（一定要锁版本号） |
| `swap` 起不来 | 一个启动脚本丢失 | 重装对应的包 |

中间还有两个"自己给自己挖坑"的插曲：`apt` 一开始连错误信息都不打印，查了半天才发现**是我自己的脚本把 stderr 吞了**；后来有个包怎么都装不上，最后发现是**批处理里的 `awk` 取错了列**，那个包压根没被重装过。

这类问题大概占了这次一半的时间 —— **真正难的不是修，而是搞清楚"到底哪里坏了"。**

最后重启验证：

```text
systemctl is-system-running → running            ← 不再是 degraded
systemctl --failed          → 0 loaded units     ← 完全干净
swap                        → 2.0Gi
/etc/shadow                 → 980 字节 root:shadow 640
lightdm / ssh / 其它服务    → 全部 active
pgrep -a labwc              → 桌面进程在跑
tty1 seat0 会话             → 自动登录成功
```

**登录、桌面、服务，全都回来了。**

---

# 总而言之

## 断电是万恶之源

这次所有问题的**唯一根因就是一次断电**。它打断了一次文件改名、丢了目录数据块、还写坏了几个大文件的内容。

> 树莓派没有电池 RTC，SD 卡也不像 SSD 有掉电保护 —— `shutdown` 之前多想一秒是值得的。

## 应急通道要提前准备

靠的是两个平时根本用不到的东西：

- **引导分区是 FAT32** → 不需要任何 ext4 驱动，插到 Windows 上就能读写；
- **`init=/bin/bash`** → 不需要登录、不需要 systemd，内核直接给你一个 root shell。

**在还能正常登录的时候就把这两条路想清楚**，比出事之后现研究划算得多。

---
