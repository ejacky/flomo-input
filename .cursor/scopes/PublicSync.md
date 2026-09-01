# 功能规格：多平台同步 (#public 标签)

## 1. 目的与用户问题

### 用户问题
用户希望在 flomo 输入的内容，当包含 `#public` 标签时，能够自动同步到多个社交平台（豆瓣、微博、小红书），减少重复发布的繁琐操作。

### 成功标准
- ✅ 用户输入包含 `#public` 标签的内容后，点击提交
- ✅ 内容自动同步到豆瓣、微博、小红书（如果已配置）
- ✅ 同步状态清晰可见（成功/失败提示）
- ✅ 不影响原有的 flomo 提交流程

## 2. 功能范围

### 核心功能
1. **标签检测**：检测输入内容中是否包含 `#public` 标签
2. **内容处理**：从内容中移除 `#public` 标签，只同步纯内容
3. **多平台同步**：将处理后的内容同步到：
   - 豆瓣：同步到广播
   - 微博：同步到个人微博（发微博）
   - 小红书：同步到笔记
4. **状态反馈**：显示同步状态（成功/失败列表）

### 已确认需求

#### Q1: 内容处理方式 ✅
- ✅ **已选择**：同步时移除 `#public` 标签，只同步纯内容

#### Q2: 同步平台的具体位置 ✅
- ✅ **豆瓣**：同步到广播
- ✅ **微博**：同步到个人微博（发微博）
- ✅ **小红书**：同步到笔记

#### Q3: 认证方式 ✅
- ✅ **已选择**：使用 Cookie/Session（需要用户登录后获取）

#### Q4: 配置界面 ✅
- ✅ **已选择**：在 options.html 中添加各平台的配置（Cookie 输入框）

#### Q5: 同步失败处理 ✅
- ✅ **已选择**：部分平台失败时，继续同步其他平台，最后显示失败列表

#### Q6: 同步时机 ✅
- ✅ **已选择**：提交到 flomo 的同时，并行同步

#### Q7: 平台可选性 ✅
- ✅ **已选择**：用户可以选择启用/禁用某个平台

## 3. 技术考虑

### 技术约束
- 浏览器扩展环境（Chrome Extension Manifest V3）
- 需要处理跨域请求
- 需要存储用户配置（API Key、Cookie 等）
- 需要考虑各平台的 API 限制和认证机制

### 潜在技术方案

#### 方案 A：使用官方 API
- **优点**：稳定、官方支持
- **缺点**：需要申请 API Key，可能有使用限制
- **适用平台**：微博（有开放平台）、豆瓣（可能有 API）

#### 方案 B：使用 Cookie/Session
- **优点**：无需申请 API Key
- **缺点**：需要用户登录，Cookie 可能过期，需要定期更新
- **适用平台**：所有平台（如果支持）

#### 方案 C：自动化脚本（Puppeteer/Playwright）
- **优点**：可以模拟真实用户操作
- **缺点**：在浏览器扩展中实现复杂，可能违反平台服务条款
- **适用平台**：所有平台（但不推荐）

### 确定方案
**Cookie + HTTP 请求方案**：
- 使用 Cookie/Session 进行认证
- 通过 HTTP 请求模拟网页提交表单
- 在 options 页面提供配置界面
- 用户需要手动获取并配置各平台的 Cookie

## 4. 用户界面

### 修改点
1. **floating.html/floating.js**
   - 提交时检测 `#public` 标签
   - 显示同步状态（可选：加载动画、成功/失败提示）

2. **options.html/options.js**
   - 添加各平台的配置区域
   - 平台启用/禁用开关（每个平台独立开关）
   - Cookie 输入框（每个平台独立）
   - Cookie 获取说明/帮助链接

## 5. 数据结构

### Chrome Storage 结构
```javascript
{
  apiUrl: string,           // 现有：flomo API URL
  foregroundToggle: boolean, // 现有：前台切换开关
  // 新增：
  publicSync: {
    platforms: {
      douban: {
        enabled: boolean,   // 是否启用豆瓣同步
        cookie: string      // 豆瓣 Cookie
      },
      weibo: {
        enabled: boolean,   // 是否启用微博同步
        cookie: string      // 微博 Cookie
      },
      xiaohongshu: {
        enabled: boolean,   // 是否启用小红书同步
        cookie: string      // 小红书 Cookie
      }
    }
  }
}
```

## 6. 实现步骤

1. **Phase 1：基础框架**
   - 在 `floating.js` 中添加 `#public` 标签检测逻辑
   - 创建平台同步模块（`src/sync/` 目录）
   - 更新 `options.html` 和 `options.js` 添加平台配置 UI
   - 更新 Chrome Storage 数据结构

2. **Phase 2：平台实现**
   - 实现豆瓣广播同步（`src/sync/douban.js`）
   - 实现微博发布同步（`src/sync/weibo.js`）
   - 实现小红书笔记同步（`src/sync/xiaohongshu.js`）
   - 实现统一的同步管理器（`src/sync/manager.js`）

3. **Phase 3：集成与优化**
   - 在 `floating.js` 中集成同步逻辑（与 flomo 提交并行）
   - 实现同步状态反馈（成功/失败列表）
   - 错误处理和重试机制
   - 用户体验优化

## 7. 超出范围

- ❌ 不支持其他标签（仅支持 `#public`）
- ❌ 不支持编辑已发布的内容
- ❌ 不支持删除已发布的内容
- ❌ 不支持图片/媒体同步（仅文本内容）

## 8. 风险评估

- **平台 API 变更**：各平台可能更改 API，需要维护
- **认证失效**：Cookie/Token 可能过期，需要重新配置
- **服务条款**：自动化发布可能违反某些平台的服务条款
- **跨域限制**：浏览器扩展的跨域请求限制

## 9. 详细实现规范

### 9.1 标签检测与内容处理

**位置**：`public/floating.js` 的 `submitContent` 函数

**逻辑**：
```javascript
// 检测是否包含 #public 标签
const hasPublicTag = content.includes('#public');

if (hasPublicTag) {
  // 移除 #public 标签（支持多种格式）
  const cleanContent = content
    .replace(/#public\s+/g, '')  // #public 后跟空格
    .replace(/\s+#public/g, '')   // #public 前有空格
    .replace(/#public/g, '')      // 独立的 #public
    .trim();
  
  // 并行执行：提交到 flomo 和同步到平台
  Promise.all([
    submitToFlomo(apiUrl, content),  // 原始内容（包含 #public）
    syncToPlatforms(cleanContent)     // 清理后的内容
  ]).then(/* 处理结果 */);
}
```

### 9.2 平台同步接口规范

每个平台同步模块需要实现以下接口：

```javascript
// src/sync/[platform].js
export async function sync(content, cookie) {
  // 返回 { success: boolean, message: string }
}
```

### 9.3 同步管理器

**文件**：`src/sync/manager.js`

**功能**：
- 读取配置，获取启用的平台列表
- 并行调用各平台的同步函数
- 收集所有平台的同步结果
- 返回成功/失败列表

### 9.4 Options 页面 UI

**布局**：
```
Flomo Input Options
├── API URL (现有)
├── Foreground Toggle (现有)
└── 多平台同步配置
    ├── 豆瓣
    │   ├── [ ] 启用
    │   └── Cookie: [输入框]
    ├── 微博
    │   ├── [ ] 启用
    │   └── Cookie: [输入框]
    └── 小红书
        ├── [ ] 启用
        └── Cookie: [输入框]
```

### 9.5 状态反馈

**位置**：`floating.js`

**显示方式**：
- 提交时显示加载状态（可选）
- 同步完成后显示结果：
  - 成功：显示 "已同步到：豆瓣、微博、小红书"
  - 部分失败：显示 "已同步到：豆瓣、微博 | 失败：小红书"
  - 全部失败：显示 "同步失败，请检查配置"

---

## 10. 技术实现细节

### 10.1 Cookie 获取方式

用户需要：
1. 登录对应平台
2. 打开浏览器开发者工具（F12）
3. 在 Network 标签中找到任意请求
4. 复制 Request Headers 中的 Cookie 值
5. 粘贴到扩展的配置页面

### 10.2 各平台 API 端点（需要调研）

- **豆瓣广播**：需要调研实际的发布接口
- **微博发布**：需要调研实际的发布接口
- **小红书笔记**：需要调研实际的发布接口

**注意**：这些接口可能需要：
- CSRF Token
- 特定的请求头
- 表单数据格式
- 可能需要反向工程网页端的提交逻辑

### 10.3 错误处理

- Cookie 过期：提示用户重新配置
- 网络错误：显示错误信息，允许重试
- 平台限制：显示平台返回的错误信息
- 超时处理：设置合理的超时时间（如 10 秒）

---

## ✅ 规格确认

所有需求已确认，等待用户输入 "GO!" 开始实现。
