雷霆战机 Thunder Fighter v1.6
================================

文件说明
--------
Thunder_fighter_jet.exe        终端版（FTXUI），单文件，无需 DLL
Thunder_fighter_jet_sdl.exe    图形版（SDL3），单文件，字体已内嵌
LICENSE-Ubuntu-Font-Licence-1.0.txt   图形版内嵌字体的授权
THIRD_PARTY_LICENSES.txt       静态链接的第三方组件许可

系统要求
--------
Windows 10 / 11，64 位。两个 exe 均为完全静态链接，不需要安装运行库或 DLL。

运行方式
--------
终端版
  双击运行，按 1 开始游戏，按提示选择难度。
  建议命令行窗口至少 104 列 x 58 行，可先执行：
      mode con: cols=110 lines=60

图形版
  双击直接进入游戏。
  WASD 移动，空格开火，P 暂停，Q 返回主菜单，F11 全屏，Esc 退出。

排行榜存档
----------
排行榜保存在 exe 同目录的 highscore.txt，首次运行会自动创建；
若同目录不存在，会兼容读取上一级目录中的旧 highscore.txt。

注意
----
exe 未做代码签名，部分安全软件可能给出提示，请确认来源后再运行。
