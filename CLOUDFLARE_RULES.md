# Cloudflare Rules 原理详解

## 目录
- [概述](#概述)
- [Transform Rules 类型](#transform-rules-类型)
- [执行原理](#执行原理)
- [URL Rewrite 工作机制](#url-rewrite-工作机制)
- [实际应用场景](#实际应用场景)
- [配置示例](#配置示例)

---

## 概述

Cloudflare Rules 是一套强大的流量处理规则系统，允许你在 Cloudflare 边缘节点（Edge）上修改 HTTP 请求和响应，而无需修改源服务器配置。

### 核心优势
- **边缘执行**：规则在 Cloudflare 全球边缘网络上执行，延迟极低
- **无需修改源代码**：所有转换在到达源服务器之前完成
- **灵活强大**：支持静态和动态规则，可以使用正则表达式和函数

---

## Transform Rules 类型

Cloudflare Transform Rules 主要包含以下几种类型：

### 1. URL Rewrite Rules（URL 重写规则）
修改请求的 URL 路径和查询字符串。

**用途：**
- 重写 URL 路径（如 `/img/abc.jpg` → `/cdn-cgi/imagedelivery/hash/abc.jpg`）
- 修改查询参数
- 路径标准化

### 2. Request Header Modification（请求头修改）
添加、删除或修改请求头。

**用途：**
- 添加认证信息
- 转发真实 IP 地址
- 添加自定义跟踪标识

### 3. Response Header Modification（响应头修改）
修改返回给用户的响应头。

**用途：**
- 添加安全头（如 CORS、CSP）
- 修改缓存策略
- 删除敏感信息

### 4. Managed Transforms（托管转换）
Cloudflare 预配置的常用转换规则。

---

## 执行原理

### 请求处理流程

```
用户浏览器
    ↓
[1] DNS 解析 → Cloudflare
    ↓
[2] URL Normalization（URL 标准化）
    ↓
[3] Transform Rules（转换规则）← 在这里执行！
    ↓
[4] Firewall Rules（防火墙规则）
    ↓
[5] Page Rules（页面规则）
    ↓
[6] Workers（边缘计算）
    ↓
[7] Cache（缓存检查）
    ↓
源服务器（如果缓存未命中）
```

### 关键特性

1. **最早执行**：Transform Rules 在几乎所有其他 Cloudflare 产品之前执行
2. **边缘处理**：请求一进入 Cloudflare 边缘节点就立即处理
3. **透明性**：URL 重写对用户浏览器完全透明，地址栏不会改变
4. **确定性**：后续产品（如防火墙、Workers）接收的是已经转换后的 URL

---

## URL Rewrite 工作机制

### Rewrite vs Redirect 的区别

| 特性 | URL Rewrite（重写） | Redirect（重定向） |
|------|-------------------|-------------------|
| **执行位置** | 服务器端（Cloudflare Edge） | 客户端（浏览器） |
| **浏览器地址栏** | 不变（显示原始 URL） | 改变（显示新 URL） |
| **HTTP 状态码** | 200 OK | 301/302/307/308 |
| **网络请求数** | 1 次 | 2 次 |
| **SEO 影响** | 无 | 有（转移权重） |
| **用户感知** | 无感知 | 可见 |

### 重写类型

#### 1. 静态重写（Static Rewrite）

直接替换 URL 的某部分为固定字符串。

**示例：**
```
原始请求: https://example.com/old-page
重写后: https://example.com/new-page
```

用户看到的 URL：`https://example.com/old-page`
源服务器收到的请求：`https://example.com/new-page`

#### 2. 动态重写（Dynamic Rewrite）

使用表达式、函数和变量来构建新的 URL。

**常用函数：**

- **regex_replace()**：正则表达式替换
  ```
  regex_replace(http.request.uri.path, "^/img/", "/cdn-cgi/imagedelivery/hash/")
  ```

- **concat()**：字符串拼接
  ```
  concat("/archive", http.request.uri.path)
  ```

- **lower()**：转小写
  ```
  lower(http.request.uri.path)
  ```

---

## 实际应用场景

### 场景 1：Cloudflare Images 自定义域名

**需求：** 将 `https://example.com/img/photo.jpg` 映射到 Cloudflare Images

**配置：**
```
When incoming requests match:
  URI Path starts with "/img/"

Then rewrite to:
  Dynamic: concat("/cdn-cgi/imagedelivery/H1BBNTYAdMQC-Xnc380GWA",
                  regex_replace(http.request.uri.path, "^/img", ""))
```

**效果：**
```
用户请求: https://example.com/img/my-image-1/public
实际处理: https://example.com/cdn-cgi/imagedelivery/H1BBNTYAdMQC-Xnc380GWA/my-image-1/public
浏览器显示: https://example.com/img/my-image-1/public
```

### 场景 2：API 版本路由

**需求：** 将 `/api/v2/` 请求路由到新的路径

**配置：**
```
When incoming requests match:
  URI Path starts with "/api/v2/"

Then rewrite to:
  Dynamic: regex_replace(http.request.uri.path, "^/api/v2/", "/new-api/")
```

### 场景 3：多语言 URL 重写

**需求：** 根据用户语言自动添加语言前缀

**配置：**
```
When incoming requests match:
  http.request.uri.path does not start with "/en/"
  AND
  http.accept_language contains "en"

Then rewrite to:
  Dynamic: concat("/en", http.request.uri.path)
```

### 场景 4：移动设备路径重写

**需求：** 移动设备访问时自动添加 `/m/` 前缀

**配置：**
```
When incoming requests match:
  http.user_agent contains "Mobile"

Then rewrite to:
  Dynamic: concat("/m", http.request.uri.path)
```

---

## 配置示例

### 通过 Dashboard 配置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名
3. 进入 **Rules** → **Transform Rules**
4. 点击 **Create rule**
5. 选择 **Rewrite URL**
6. 配置规则：

   **规则名称：** `Cloudflare Images Custom Path`

   **When incoming requests match:**
   ```
   Field: URI Path
   Operator: starts with
   Value: /img/
   ```

   **Then rewrite to:**
   ```
   Type: Dynamic
   Expression: concat("/cdn-cgi/imagedelivery/H1BBNTYAdMQC-Xnc380GWA",
                      regex_replace(http.request.uri.path, "^/img", ""))
   ```

7. 点击 **Deploy**

### 通过 API 配置

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Cloudflare Images Custom Path",
    "kind": "zone",
    "phase": "http_request_transform",
    "rules": [
      {
        "expression": "starts_with(http.request.uri.path, \"/img/\")",
        "action": "rewrite",
        "action_parameters": {
          "uri": {
            "path": {
              "expression": "concat(\"/cdn-cgi/imagedelivery/H1BBNTYAdMQC-Xnc380GWA\", regex_replace(http.request.uri.path, \"^/img\", \"\"))"
            }
          }
        }
      }
    ]
  }'
```

---

## 高级技巧

### 1. 条件组合

可以使用多个条件组合：

```
When incoming requests match:
  (URI Path starts with "/img/")
  AND
  (Country equals "CN")
  AND
  (NOT http.request.uri.path contains "private")

Then rewrite to:
  ...
```

### 2. 查询参数保留

重写路径时保留原有查询参数：

```javascript
concat(
  "/cdn-cgi/imagedelivery/hash",
  http.request.uri.path,
  "?",
  http.request.uri.query
)
```

### 3. 正则表达式捕获组

使用正则表达式提取 URL 部分：

```javascript
regex_replace(
  http.request.uri.path,
  "^/products/([0-9]+)/.*",
  "/api/product/$1"
)
```

---

## 限制和注意事项

### 免费计划限制
- **URL Rewrite Rules**: 2 条规则
- **Request Header Modification**: 2 条规则
- **Response Header Modification**: 2 条规则
- **不支持正则表达式**（需要 Business 或 Enterprise 计划）

### 付费计划
- **Pro**: 5 条规则
- **Business**: 10 条规则 + 正则表达式支持
- **Enterprise**: 25 条规则 + 高级功能

### 重要限制
1. **无法重写主机名**：需要使用 Origin Rules
2. **必须开启 Cloudflare 代理**：DNS 记录必须是橙色云朵状态
3. **执行顺序固定**：无法调整 Transform Rules 与其他产品的执行顺序

---

## 调试技巧

### 1. 使用浏览器开发者工具

检查实际请求的响应头，Cloudflare 会添加调试信息：

```
CF-RAY: 请求追踪 ID
CF-Cache-Status: 缓存状态
```

### 2. 启用 Trace 功能

在 Cloudflare Dashboard 的 **Rules** → **Trace** 可以模拟请求查看规则匹配情况。

### 3. 临时添加响应头

创建一个响应头修改规则，添加自定义头来验证规则是否生效：

```
Add response header:
  Name: X-Custom-Rewrite
  Value: Applied
```

---

## 总结

Cloudflare Transform Rules 提供了强大的请求处理能力：

1. **在边缘执行**：低延迟、高性能
2. **透明重写**：用户无感知
3. **灵活配置**：支持静态和动态规则
4. **优先执行**：在其他产品之前处理请求

通过合理使用 Transform Rules，你可以：
- 实现自定义 URL 结构
- 简化源服务器配置
- 提升用户体验
- 增强安全性

---

## 参考资源

- [Cloudflare Transform Rules 官方文档](https://developers.cloudflare.com/rules/transform/)
- [URL Rewrite Rules 文档](https://developers.cloudflare.com/rules/transform/url-rewrite/)
- [Transform Rules 博客](https://blog.cloudflare.com/introducing-transform-rules-with-url-rewriting-at-the-edge/)
