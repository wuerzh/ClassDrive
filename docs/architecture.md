# ClassDrive 架构设计文档

## 1. 系统架构概览

ClassDrive 是一个面向课堂教学的单体应用，采用前后端分离架构，专为局域网部署优化。

### 1.1 技术栈

**后端**:
- **语言**: Go 1.21+
- **HTTP 服务**: 标准库 `net/http`
- **数据库**: SQLite 3 (WAL 模式)
- **密码加密**: bcrypt
- **前端资源**: embed 嵌入到二进制文件

**前端**:
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript (严格模式)
- **构建工具**: Vite 6
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI 组件**: Element Plus
- **测试**: Vitest + Playwright

### 1.2 部署架构

```
┌─────────────────────────────────────────┐
│      局域网环境 (教室/机房)              │
│                                         │
│  ┌──────────┐         ┌──────────────┐ │
│  │ 教师电脑 │◄───────►│ ClassDrive   │ │
│  │ (浏览器) │         │    服务器    │ │
│  └──────────┘         │              │ │
│                       │  ┌─────────┐ │ │
│  ┌──────────┐         │  │ SQLite  │ │ │
│  │ 学生电脑 │◄───────►│  │ 数据库  │ │ │
│  │ (浏览器) │         │  └─────────┘ │ │
│  └──────────┘         │              │ │
│                       │  ┌─────────┐ │ │
│  ┌──────────┐         │  │ 文件    │ │ │
│  │ 学生电脑 │◄───────►│  │ 存储    │ │ │
│  │ (浏览器) │         │  └─────────┘ │ │
│  └──────────┘         └──────────────┘ │
└─────────────────────────────────────────┘
```

---

## 2. 数据库设计

### 2.1 Schema 概览

ClassDrive 使用 SQLite 数据库，包含以下核心表：

#### 核心表结构

**teachers** - 教师账号表
```sql
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',  -- 'owner' 或 'staff'
    disabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**classes** - 班级表
```sql
CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    join_code TEXT,
    join_code_hash TEXT,
    registration_enabled INTEGER NOT NULL DEFAULT 0,
    registration_expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**students** - 学生表
```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    student_no TEXT NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    activated_at TEXT,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(class_id, student_no)
);
```

**files** - 文件/文件夹表
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    space TEXT NOT NULL,  -- 'library', 'public', 'class'
    class_id INTEGER,
    kind TEXT NOT NULL,   -- 'file' 或 'dir'
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    fs_path TEXT,  -- 物理文件路径
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
CREATE INDEX idx_files_space_class_path ON files(space, class_id, path);
CREATE INDEX idx_files_parent_path ON files(space, class_id, path);
```

**assignments** - 作业表
```sql
CREATE TABLE assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' 或 'published'
    submission_mode TEXT NOT NULL DEFAULT 'any',  -- 'any', 'files', 'folder'
    submission_type_category TEXT,
    min_file_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
```

**assignment_submissions** - 作业提交表
```sql
CREATE TABLE assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'partial',  -- 'partial' 或 'submitted'
    review_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' 或 'reviewed'
    teacher_comment TEXT,
    reviewed_by_teacher_id INTEGER,
    reviewed_at TEXT,
    submitted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(assignment_id, student_id)
);
```

**library_shares** - 资料分享表
```sql
CREATE TABLE library_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    access_code_hash TEXT,
    entry_id INTEGER NOT NULL,
    permission TEXT NOT NULL DEFAULT 'view',  -- 'view' 或 'download'
    expires_at TEXT NOT NULL,
    disabled INTEGER NOT NULL DEFAULT 0,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TEXT,
    created_by_teacher_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_teacher_id) REFERENCES teachers(id)
);
CREATE INDEX idx_library_shares_token ON library_shares(token);
```

**sessions** - 会话表
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_type TEXT NOT NULL,  -- 'teacher' 或 'student'
    user_id INTEGER NOT NULL,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**audit_login_logs** - 登录日志表
```sql
CREATE TABLE audit_login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    actor_type TEXT NOT NULL,  -- 'teacher' 或 'student'
    actor_id INTEGER,
    username TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'success' 或 'failure'
    ip_address TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_login_logs_occurred ON audit_login_logs(occurred_at DESC);
```

**audit_operation_logs** - 操作日志表
```sql
CREATE TABLE audit_operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id INTEGER,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_operation_logs_occurred ON audit_operation_logs(occurred_at DESC);
```

### 2.2 关键索引说明

- **files 表**: 按 `(space, class_id, path)` 组合索引，优化文件列表查询
- **sessions 表**: 按 `token` 唯一索引，按 `expires_at` 索引用于过期清理
- **library_shares 表**: 按 `token` 唯一索引，快速验证分享链接
- **audit 日志表**: 按 `occurred_at DESC` 索引，优化时间范围查询

### 2.3 数据库配置

SQLite 启动参数：
```
?_busy_timeout=5000&_journal_mode=WAL&_synchronous=NORMAL
```

- `_busy_timeout=5000`: 写锁等待超时 5 秒
- `_journal_mode=WAL`: Write-Ahead Logging 模式，提升并发性能
- `_synchronous=NORMAL`: 平衡性能与安全性

---

## 3. 文件存储设计

### 3.1 物理存储结构

```
var/
├── db/
│   └── classdrive.db          # SQLite 数据库
├── files/
│   ├── library/               # 老师资料空间
│   │   ├── <hash>/           # 按文件内容 hash 存储
│   │   │   └── file.ext
│   │   └── ...
│   ├── public/                # 公共资料空间
│   │   └── ...
│   └── classes/               # 班级资料空间
│       ├── <class_id>/
│       │   └── ...
│       └── ...
├── submissions/               # 学生作业提交
│   ├── <assignment_id>/
│   │   ├── <student_id>/
│   │   │   └── files...
│   │   └── ...
│   └── ...
├── attachments/               # 作业附件
│   ├── <assignment_id>/
│   │   └── files...
│   └── ...
└── upload-sessions/           # TUS 断点续传临时文件
    └── ...
```

### 3.2 文件去重策略

教师资料空间使用内容寻址存储（Content-Addressable Storage）：
- 计算文件内容的 SHA-256 哈希值
- 相同内容的文件共享物理存储
- 数据库记录引用关系

学生提交和附件使用独立存储，不去重。

### 3.3 文件上传策略

**小文件 (< 10MB)**: 
- 使用 multipart/form-data 上传
- 支持批量上传
- 支持文件夹结构保留

**大文件 (>= 10MB)**:
- 使用 TUS 协议断点续传
- 256KB 分块上传
- 支持网络中断后恢复

---

## 4. 认证与授权

### 4.1 认证机制

**教师端**:
- 用户名 + 密码登录
- bcrypt 密码加密 (cost=10)
- Session Cookie 有效期 24 小时
- 支持单账号登录限制（可配置）

**学生端**:
- 班级注册码 + 学号 + 密码激活
- 首次激活后必须修改初始密码
- 独立的 Session Cookie
- 密码重置后强制修改密码

### 4.2 CSRF 防护

所有写操作（POST/PUT/PATCH/DELETE）需要 CSRF Token：
- Cookie: `classdrive_csrf`
- Header: `X-CSRF-Token`
- Token 在登录时生成，存储在 session 表

### 4.3 权限模型

**教师角色**:
- `owner`: 系统所有者，全部权限
- `staff`: 普通教师，不能管理其他教师账号和系统设置

**学生权限**:
- 只能访问自己班级的资料
- 只能查看和提交自己的作业
- 不能访问其他学生的提交

### 4.4 分享访问控制

资料分享支持：
- **仅查看**: 可浏览目录和预览文件，不能下载
- **允许下载**: 可下载单个文件或整个目录压缩包
- **安全码保护**: 可选设置访问密码
- **有效期**: 1天/7天/30天/永久/自定义

---

## 5. API 设计规范

### 5.1 端点命名规范

```
/api/
├── auth/                      # 教师认证
│   ├── login                 # POST 登录
│   └── logout                # POST 登出
├── student/                   # 学生端点
│   ├── auth/                 # 学生认证
│   │   ├── activate          # POST 激活账号
│   │   ├── login             # POST 登录
│   │   └── logout            # POST 登出
│   ├── session               # GET 会话信息
│   ├── password              # POST 修改密码
│   ├── assignments           # GET 作业列表
│   ├── assignments/:id       # GET 作业详情
│   ├── assignments/:id/submission  # POST 提交作业
│   └── files                 # GET 资料列表
├── session                    # GET 教师会话信息
├── shell                      # GET 导航信息
├── classes                    # 班级管理
├── students                   # 学生管理
├── assignments                # 作业管理
├── files                      # 文件管理
├── library-shares             # 资料分享
├── share/:token               # 分享访问
├── settings/                  # 设置
│   ├── profile               # 个人设置
│   ├── system                # 系统设置
│   └── password              # 修改密码
├── teachers                   # 教师账号管理
└── audit/                     # 审计日志
    ├── login-logs
    ├── operation-logs
    └── logs
```

### 5.2 响应格式

**成功响应**:
```json
{
  "data": { ... }
}
```

**错误响应**:
```json
{
  "error": {
    "code": "invalid_input",
    "message": "用户友好的错误信息"
  }
}
```

**列表响应**:
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 30,
    "total": 100,
    "totalPages": 4
  }
}
```

### 5.3 常见错误码

- `invalid_input`: 输入参数无效
- `unauthorized`: 未登录或会话过期
- `forbidden`: 无权限访问
- `not_found`: 资源不存在
- `conflict`: 资源冲突（如重名）
- `server_error`: 服务器内部错误

---

## 6. 前端架构

### 6.1 目录结构

```
frontend/src/
├── api/
│   └── client.ts              # API 客户端封装
├── assets/                    # 静态资源
├── components/                # 可复用组件
│   ├── ConfirmDialog.vue
│   ├── FilePreviewDialog.vue
│   ├── PaginationControls.vue
│   └── ...
├── composables/               # 组合式函数
│   ├── useFocusTrap.ts
│   ├── useStudentAssignments.ts
│   └── ...
├── layouts/                   # 布局组件
│   ├── ShellLayout.vue        # 教师端布局
│   └── StudentLayout.vue      # 学生端布局
├── router/
│   └── index.ts               # 路由配置
├── stores/                    # Pinia stores
│   ├── auth.ts
│   ├── assignments.ts
│   ├── toast.ts
│   └── ...
├── utils/                     # 工具函数
│   ├── file-preview.ts
│   ├── password-strength.ts
│   └── ...
├── views/                     # 页面组件
│   ├── LoginView.vue
│   ├── FilesView.vue
│   ├── AssignmentsView.vue
│   └── ...
├── App.vue
└── main.ts
```

### 6.2 状态管理

使用 Pinia 管理全局状态：
- `authStore`: 教师认证状态
- `studentAuthStore`: 学生认证状态
- `toastStore`: 全局提示消息
- `uploadStore`: 文件上传状态
- `assignmentsStore`: 作业数据
- `classesStore`: 班级数据

### 6.3 路由守卫

- 教师路由需要 `requiresAuth: true`
- 学生路由需要 `requiresStudentAuth: true`
- Owner 专属功能需要 `ownerOnly: true`
- 学生首次登录必须修改密码

---

## 7. 性能优化策略

### 7.1 数据库优化

- 使用 WAL 模式提升并发读写性能
- 关键查询路径添加索引
- 避免 N+1 查询，使用 JOIN 或批量查询
- 大列表查询使用分页

### 7.2 文件传输优化

- 大文件使用 TUS 断点续传
- 支持 Range 请求，浏览器可断点下载
- 静态资源使用浏览器缓存
- 批量下载时流式生成 ZIP

### 7.3 前端优化

- 路由级别代码分割
- 图片懒加载
- 虚拟滚动（计划中）
- 本地缓存常用数据

---

## 8. 安全设计

### 8.1 输入验证

- 所有用户输入进行类型和格式验证
- 文件上传限制类型和大小
- 路径参数防止目录遍历
- SQL 使用参数化查询

### 8.2 密码安全

- bcrypt 加密存储
- 学生重置密码后强制修改
- 支持通过环境变量配置初始密码
- 密码最低 6 位要求

### 8.3 会话安全

- HttpOnly Cookie 防止 XSS 窃取
- CSRF Token 保护写操作
- 会话 24 小时自动过期
- 支持单账号登录限制

### 8.4 日志审计

记录所有关键操作：
- 登录成功/失败
- 文件上传/下载
- 作业提交
- 批改操作
- 设置修改

---

## 9. 扩展性考虑

### 9.1 当前限制

- 单机部署，不支持集群
- SQLite 并发写入有限
- 文件存储在本地磁盘
- 适合 50 人以下班级

### 9.2 未来扩展方向

- 迁移到 PostgreSQL/MySQL 支持更高并发
- 文件存储迁移到对象存储（S3/MinIO）
- 添加 Redis 缓存层
- 支持多教师协作
- 移动端原生应用

---

## 10. 部署与运维

### 10.1 最小系统要求

- CPU: 双核
- 内存: 2GB
- 磁盘: 10GB+（视文件存储量而定）
- 操作系统: Windows/Linux/macOS

### 10.2 端口配置

- 默认端口: 80
- 可通过环境变量 `CLASSDRIVE_PORT` 配置
- 或在设置页面持久化配置

### 10.3 数据备份

建议定期备份：
```bash
# 备份数据库
cp var/db/classdrive.db backup/classdrive_$(date +%Y%m%d).db

# 备份文件存储
tar -czf backup/files_$(date +%Y%m%d).tar.gz var/files/
```

### 10.4 日志管理

日志输出到标准输出，可重定向到文件：
```bash
./ClassDrive.exe >> logs/classdrive.log 2>&1
```

---

**文档版本**: 1.0  
**最后更新**: 2026-06-13  
**维护者**: ClassDrive 开发团队
