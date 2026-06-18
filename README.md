# 生词循环播放器

一个可以直接在浏览器运行的简单生词播放网页 App，适合先在 iPhone Safari 里试用。

## 功能

- 添加英文单词和中文意思
- 添加单词时会用本地词典自动填中文意思，并在线尝试补充音标
- 首次打开自动导入 `words.xlsx` 转换出的 261 个单词
- 中文释义会自动压缩为最多 5 个常见意思
- 自动保存到当前浏览器
- 每个单词连续播放 3 遍：英文读音 -> 英文拼写 -> 中文意思
- 播放、暂停、停止、上一个、下一个
- 调整语速和词间间隔
- 支持随机播放，所有单词播完后继续循环
- 支持导出当前词库 JSON 备份

## 本地运行

这个项目没有构建步骤。可以直接打开 `index.html`，也可以用一个本地静态服务器预览：

```bash
python3 -m http.server 4173 --directory /home/liquan/vocab-loop-player
```

然后访问：

```text
http://localhost:4173
```

当前这台电脑的局域网预览地址是：

```text
http://192.168.38.214:4173
```

## iPhone 试用

1. 让电脑和 iPhone 连接同一个 Wi-Fi。
2. 在电脑上运行本地服务器。
3. 查询电脑的局域网 IP，例如 `ip addr`。
4. 在 iPhone Safari 打开 `http://电脑IP:4173`，当前可先试 `http://192.168.38.214:4173`。
5. 点 Safari 分享按钮，选择“添加到主屏幕”。

## 注意

语音播放使用浏览器内置 Web Speech API。iPhone Safari 通常需要先点一次“播放”，网页才能开始朗读。不同 iOS 版本可用的英文和中文语音会略有差异。

## 免费公网部署

推荐用 GitHub Pages 或 Cloudflare Pages。这个项目是纯静态网页，不需要服务器和数据库。

### GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `vocab-loop-player`。
2. 把本项目里的文件上传到仓库根目录，至少需要：
	- `index.html`
	- `styles.css`
	- `app.js`
	- `manifest.json`
	- `sw.js`
	- `icon.svg`
	- `seed-words.json`
3. 进入仓库的 Settings -> Pages。
4. Source 选择 Deploy from a branch。
5. Branch 选择 `main`，目录选择 `/root`，保存。
6. 等 1 到 3 分钟，GitHub 会生成一个网址，格式通常是：

```text
https://你的用户名.github.io/vocab-loop-player/
```

### Cloudflare Pages

1. 登录 Cloudflare，进入 Workers & Pages。
2. 创建 Pages 项目。
3. 如果不想连接 GitHub，可以选择直接上传静态文件。
4. 上传本项目文件。
5. 部署完成后会得到一个 `pages.dev` 网址。

## 手机上安装

部署完成后，用 iPhone Safari 打开公网网址，点分享按钮，选择“添加到主屏幕”。第一次打开时会自动导入单词，之后可以离线使用；如果 iOS 清理了缓存，再联网打开一次即可恢复。
