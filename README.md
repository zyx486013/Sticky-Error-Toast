# Sticky Error Toast（SillyTavern 扩展）

一个轻量级 SillyTavern 扩展，只修改 `toastr.error` 红色错误通知：

- 默认常驻显示（`timeOut = 0`、`extendedTimeOut = 0`），点击通知正文或右上角 × 即可关闭。
- 成功、信息、警告通知不受影响。
- 默认最多同时显示 5 条红色错误；出现新错误时，最早的错误会被移除。
- 可在 Extensions 设置中关闭扩展、调整显示时长和同时显示数量。
- 不建立通知历史、不捕获 Console、不做正则匹配。
- 设置保存在 SillyTavern 的扩展设置中。

## 安装

1. 在 SillyTavern 打开 **扩展（Extensions）→ 安装扩展（Install Extension）**。
2. 粘贴 `https://github.com/zyx486013/Sticky-Error-Toast`，点击安装。
3. 安装后刷新页面，在扩展设置中找到 **Sticky Error Toast**。

如果之前手动安装过压缩包版，请先卸载旧版或移出原来的 `ST-StickyErrorToast` 文件夹，再通过网址安装，避免重复加载。

## 默认设置

- 启用：是
- 显示时间：一直显示（手动关闭）
- 同时最多显示：5 条

## 注意

建议不要同时启用其他会重写 `toastr.error` 的通知管理扩展，以免不同扩展的显示时间设置互相覆盖。若要停用本扩展，先在设置中取消勾选；完全卸载时删除扩展文件夹并刷新页面。
