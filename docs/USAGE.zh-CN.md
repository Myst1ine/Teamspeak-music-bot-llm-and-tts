# HAJIMI 音乐机器人使用文档

## 1. 快速启动

在项目根目录执行（Windows）：

```bat
scripts\quick-start.bat
```

启动成功后访问：

`http://localhost:3000`

---

## 2. 首次使用流程

1. 打开 WebUI，先创建管理员账号并登录。  
2. 进入「设置 -> 机器人管理」，创建机器人实例。  
3. 服务器地址填：`losantos.ts3.one`（或你自己的 TS 服务器）。  
4. 保存并点击启动。  
5. 在 TeamSpeak 频道聊天框中使用命令控制机器人。  

---

## 3. 指令前缀

当前前缀：`!hajimi`

例如：

`!hajimi help`

---

## 4. 指令总览

### 4.1 播放与点歌

- `!hajimi play <关键词>`：搜索并立即播放（默认网易云）
- `!hajimi play -q <关键词>`：从 QQ 音乐搜索播放
- `!hajimi play -b <关键词>`：从 Bilibili 搜索播放
- `!hajimi play -y <关键词>`：从 YouTube 搜索播放（需可用 yt-dlp）
- `!hajimi add <关键词>`：加入队列
- `!hajimi playnext <关键词>`：插入下一首
- `!hajimi pn <关键词>`：`playnext` 别名

### 4.2 播放控制

- `!hajimi pause`：暂停
- `!hajimi resume`：继续
- `!hajimi next`：下一首
- `!hajimi prev`：上一首
- `!hajimi stop`：停止并清空队列
- `!hajimi vol <0-100>`：设置音量

### 4.3 队列与模式

- `!hajimi queue`：查看队列
- `!hajimi list`：`queue` 别名
- `!hajimi remove <序号>`：删除队列中的指定歌曲
- `!hajimi clear`：清空队列
- `!hajimi mode <seq|loop|random|rloop>`：切换播放模式

模式说明：

- `seq`：顺序播放
- `loop`：列表循环
- `random`：随机播放
- `rloop`：随机循环

### 4.4 歌单/专辑/电台

- `!hajimi playlist <歌单名或ID>`：加载歌单
- `!hajimi playlist -q <歌单名或ID>`：从 QQ 音乐加载歌单
- `!hajimi album <专辑名或ID>`：加载专辑
- `!hajimi fm`：网易云私人 FM（需登录网易账号）
- `!hajimi artist <歌手名>`：按歌手循环播放
- `!hajimi artist -q <歌手名>`：QQ 音乐歌手循环

### 4.5 信息与投票

- `!hajimi now`：查看当前播放信息
- `!hajimi lyrics`：查看歌词（返回部分内容）
- `!hajimi vote`：投票切歌
- `!hajimi help`：显示帮助

### 4.6 AI 指令

- `!hajimi ai <请求>`：AI 聊天/智能点歌
- `!hajimi say <文本>`：TTS 语音播报（MVP：播放音乐时不可用）

示例：

- `!hajimi ai 推荐几首适合夜晚听的歌`
- `!hajimi ai 来一首周杰伦的慢歌`

---

## 5. 常用别名

- `!hajimi p` = `!hajimi play`
- `!hajimi s` = `!hajimi skip/next`
- `!hajimi n` = `!hajimi next`

---

## 6. 运行建议

1. 机器人常驻：电脑开机后运行 `scripts\quick-start.bat`。  
2. 建议设置系统开机自启（任务计划程序）调用 `quick-start.bat`。  
3. AI Key 请妥善保管，不要上传到公开仓库。  
4. 若要启用 TTS，请在 `config.json` 中配置：
   - `ttsEnabled: true`
   - `ttsBaseUrl`（例如你的 Qwen TTS HTTP 服务地址）
   - `ttsApiKey`（如果服务需要）
   - `ttsModel`
   - `ttsVoice`
   - `ttsFormat`（建议 `wav`）

### VoxCPM（B 路线）本地 HTTP 服务示例

1. 安装 Python 依赖（在你自己的 Python 环境中）：

```bash
pip install voxcpm fastapi uvicorn soundfile numpy
```

2. 启动本地 TTS 服务：

```bash
python scripts/tts/voxcpm_server.py --host 127.0.0.1 --port 8000 --model openbmb/VoxCPM2
```

3. 在 `config.json` 中设置：

```json
{
  "ttsEnabled": true,
  "ttsBaseUrl": "http://127.0.0.1:8000",
  "ttsApiKey": "",
  "ttsModel": "openbmb/VoxCPM2",
  "ttsVoice": "default",
  "ttsFormat": "wav"
}
```

4. 重启机器人后测试：

`!hajimi say 大家晚上好`

---

## 7. 常见问题

- WebUI 打不开：确认进程已启动，检查 `3000` 端口是否监听。  
- 提示未连接 TS：先在 WebUI 中启动机器人实例。  
- `-y` 搜索无结果：检查 `yt-dlp` 可用性。  
- AI 不回复：检查 `config.json` 中 `aiEnabled`、`aiApiKey`、`aiBaseUrl`、`aiModel`。  
