# ClassDrive 部署指南

本文档提供 ClassDrive 在不同环境下的部署指导。

---

## 1. 快速开始

### 1.1 使用预编译的 Windows 可执行文件

这是最简单的部署方式，适合大多数场景。

**步骤**:

1. **下载** `ClassDrive.exe` 到目标目录
2. **双击运行** 或在命令行中执行：
   ```powershell
   .\ClassDrive.exe
   ```
3. 查看控制台输出的访问地址，例如：
   ```
   ClassDrive 正在运行
   局域网访问地址: http://192.168.1.100:80
   本机访问地址: http://localhost:80
   默认教师账号: admin
   默认密码: demo123
   ```
4. **浏览器访问** 显示的地址
5. **首次登录** 使用默认账号，**立即修改密码**

**注意事项**:
- 首次运行会在当前目录创建 `var/` 文件夹存储数据
- 默认监听 80 端口，如果被占用，程序会提示错误
- 关闭命令行窗口会停止服务

---

## 2. 局域网部署

### 2.1 部署场景

**典型场景**:
- 机房实训课程
- 教室内课堂教学
- 办公室内小组协作

**网络要求**:
- 教师电脑和学生电脑在同一局域网
- 无需互联网连接
- 建议使用有线网络（更稳定）

### 2.2 部署步骤

#### Step 1: 选择部署电脑

选择一台配置较好的电脑作为服务器：
- **推荐配置**: 
  - CPU: 4 核心及以上
  - 内存: 4GB 及以上
  - 硬盘: 至少 20GB 可用空间
  - 网络: 千兆以太网

#### Step 2: 配置防火墙

**Windows 防火墙设置**:

1. 打开 **Windows Defender 防火墙** > **高级设置**
2. 点击 **入站规则** > **新建规则**
3. 选择 **端口** > **下一步**
4. 选择 **TCP**，输入端口号（默认 80）
5. 选择 **允许连接**
6. 应用到 **域**、**专用** 和 **公用** 网络
7. 命名规则为 "ClassDrive"

**或使用命令行**:
```powershell
# 以管理员身份运行
netsh advfirewall firewall add rule name="ClassDrive" dir=in action=allow protocol=TCP localport=80
```

#### Step 3: 启动服务

**命令行启动（推荐）**:
```powershell
# 进入程序目录
cd C:\ClassDrive

# 启动服务
.\ClassDrive.exe

# 保持命令行窗口打开
```

**后台运行方式** (使用 NSSM):
```powershell
# 下载 NSSM: https://nssm.cc/download
# 安装为 Windows 服务
nssm install ClassDrive "C:\ClassDrive\ClassDrive.exe"
nssm set ClassDrive AppDirectory "C:\ClassDrive"
nssm start ClassDrive
```

#### Step 4: 获取局域网 IP 地址

```powershell
# 查看本机 IP 地址
ipconfig

# 找到"以太网适配器"或"无线局域网适配器"下的 IPv4 地址
# 例如: 192.168.1.100
```

程序启动时也会自动显示局域网访问地址。

#### Step 5: 学生端访问测试

在学生电脑浏览器中输入：
```
http://192.168.1.100:80
```

如果无法访问，检查：
- [ ] 服务器程序是否正在运行
- [ ] 防火墙是否已放行
- [ ] 两台电脑是否在同一局域网
- [ ] IP 地址和端口是否正确

### 2.3 端口配置

**默认端口 80 被占用时**:

方式一：使用环境变量（临时）
```powershell
$env:CLASSDRIVE_PORT = "8080"
.\ClassDrive.exe
```

方式二：在设置页面配置（持久化）
1. 登录教师端
2. 进入 **设置** > **系统设置**
3. 修改 **服务器端口** 为 `8080`
4. 点击 **保存设置**
5. 重启程序

**端口选择建议**:
- `80`: 默认 HTTP 端口，访问时无需输入端口号
- `8080`: 常用备选端口
- `3000-9000`: 高编号端口，较少冲突

---

## 3. 长期运行部署

### 3.1 作为 Windows 服务运行

使用 **NSSM**（Non-Sucking Service Manager）:

**安装步骤**:

1. 下载 NSSM：https://nssm.cc/download
2. 解压到 `C:\nssm\`
3. 以管理员身份运行 PowerShell：

```powershell
# 安装服务
C:\nssm\nssm.exe install ClassDrive

# 在弹出的窗口中配置：
# - Path: C:\ClassDrive\ClassDrive.exe
# - Startup directory: C:\ClassDrive
# - Service name: ClassDrive
# - Startup type: Automatic

# 启动服务
net start ClassDrive

# 查看服务状态
sc query ClassDrive
```

**服务管理**:
```powershell
# 停止服务
net stop ClassDrive

# 重启服务
net stop ClassDrive && net start ClassDrive

# 卸载服务
C:\nssm\nssm.exe remove ClassDrive confirm
```

### 3.2 开机自启动

**方式一：使用 Windows 服务**（推荐）
- 按照 3.1 配置 NSSM 服务，将启动类型设为 **Automatic**

**方式二：使用任务计划程序**

1. 打开 **任务计划程序**
2. 创建基本任务：
   - 名称: ClassDrive
   - 触发器: 当计算机启动时
   - 操作: 启动程序
   - 程序: `C:\ClassDrive\ClassDrive.exe`
   - 起始于: `C:\ClassDrive`
3. 属性设置：
   - 勾选 "使用最高权限运行"
   - 勾选 "不管用户是否登录都要运行"

---

## 4. 数据管理

### 4.1 数据存储位置

所有运行数据存储在 `var/` 目录：

```
var/
├── db/
│   ├── classdrive.db          # 主数据库
│   ├── classdrive.db-shm       # WAL 共享内存文件
│   └── classdrive.db-wal       # WAL 日志文件
├── files/
│   ├── library/               # 老师资料
│   ├── public/                # 公共资料
│   └── classes/               # 班级资料
├── submissions/               # 学生作业提交
├── attachments/               # 作业附件
└── upload-sessions/           # 临时上传文件
```

### 4.2 数据备份

**手动备份**:

```powershell
# 停止服务
net stop ClassDrive

# 备份整个 var 目录
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path "C:\ClassDrive\var" -DestinationPath "D:\Backup\ClassDrive_$timestamp.zip"

# 启动服务
net start ClassDrive
```

**自动备份脚本** (`backup.ps1`):

```powershell
# 配置
$sourceDir = "C:\ClassDrive\var"
$backupDir = "D:\Backup\ClassDrive"
$maxBackups = 7  # 保留最近 7 天的备份

# 创建备份目录
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 生成备份文件名
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "ClassDrive_$timestamp.zip"

# 执行备份
Write-Host "开始备份: $backupFile"
Compress-Archive -Path $sourceDir -DestinationPath $backupFile -Force

# 清理旧备份
Get-ChildItem $backupDir -Filter "ClassDrive_*.zip" | 
    Sort-Object CreationTime -Descending | 
    Select-Object -Skip $maxBackups | 
    Remove-Item -Force

Write-Host "备份完成"
```

**设置定时备份**:

1. 保存脚本为 `C:\ClassDrive\backup.ps1`
2. 打开 **任务计划程序**
3. 创建基本任务：
   - 名称: ClassDrive 每日备份
   - 触发器: 每天凌晨 2:00
   - 操作: 启动程序
   - 程序: `powershell.exe`
   - 参数: `-ExecutionPolicy Bypass -File "C:\ClassDrive\backup.ps1"`

### 4.3 数据恢复

```powershell
# 停止服务
net stop ClassDrive

# 删除当前数据
Remove-Item "C:\ClassDrive\var" -Recurse -Force

# 解压备份
Expand-Archive -Path "D:\Backup\ClassDrive_20260613_020000.zip" -DestinationPath "C:\ClassDrive\"

# 启动服务
net start ClassDrive
```

---

## 5. 安全加固

### 5.1 修改默认密码

**强制配置初始密码** (启动前):

```powershell
# 设置环境变量
$env:CLASSDRIVE_DEFAULT_TEACHER_PASSWORD = "YourStrongPassword123!"
$env:CLASSDRIVE_DEFAULT_STUDENT_RESET_PASSWORD = "StudentPass456!"

# 启动程序
.\ClassDrive.exe
```

**或将环境变量添加到系统**:

1. 右键 **此电脑** > **属性** > **高级系统设置**
2. 点击 **环境变量**
3. 在 **系统变量** 中新建：
   - 变量名: `CLASSDRIVE_DEFAULT_TEACHER_PASSWORD`
   - 变量值: `YourStrongPassword123!`
4. 重启程序

### 5.2 单账号登录限制

在 **设置** > **系统设置** 中开启 **单账号登录控制**：
- 开启后，同一账号在新地点登录会踢出旧会话
- 防止账号共享

### 5.3 定期更新

- 关注 GitHub Release 页面
- 定期下载最新版本替换旧版 exe
- 备份数据后再更新

### 5.4 网络隔离

**建议**:
- 部署在内网，不要暴露到公网
- 使用独立的 VLAN（如果条件允许）
- 关闭不必要的其他网络服务

---

## 6. 性能优化

### 6.1 系统调优

**Windows 性能设置**:
1. 关闭不必要的后台程序
2. 禁用 Windows 更新（上课期间）
3. 设置电源计划为 **高性能**

**磁盘优化**:
- 使用 SSD 存储 `var/` 目录
- 定期清理临时文件和日志

### 6.2 并发用户数建议

根据服务器配置：

| 配置 | 并发用户数 | 备注 |
|------|-----------|------|
| 2核/2GB | 10-20 人 | 小班教学 |
| 4核/4GB | 20-50 人 | 标准班级 |
| 8核/8GB | 50-100 人 | 大班或多班 |

**瓶颈因素**:
- 网络带宽（大文件上传下载）
- 磁盘 I/O（并发上传）
- CPU（文件压缩和解压）

### 6.3 带宽预估

**典型场景**:
- 学生查看资料（10MB 文件）：需要约 1 秒（100Mbps 网络）
- 学生提交作业（50MB）：需要约 5 秒
- 50 人同时下载 10MB：需要约 50 秒（千兆网络）

**建议**:
- 千兆以太网交换机
- 服务器使用有线连接
- 学生端优先使用有线连接

---

## 7. 监控与日志

### 7.1 查看运行日志

**命令行输出**:
程序启动时直接输出日志到控制台。

**重定向到文件**:
```powershell
.\ClassDrive.exe > logs\classdrive.log 2>&1
```

**日志分析**:
```powershell
# 查看最后 50 行
Get-Content logs\classdrive.log -Tail 50

# 查找错误
Select-String -Path logs\classdrive.log -Pattern "error|ERROR"

# 实时监控
Get-Content logs\classdrive.log -Wait -Tail 10
```

### 7.2 数据库健康检查

```powershell
# 使用 SQLite CLI
sqlite3 var\db\classdrive.db

# 运行完整性检查
PRAGMA integrity_check;

# 查看数据库大小
.dbinfo

# 优化数据库
VACUUM;

# 退出
.quit
```

### 7.3 磁盘空间监控

```powershell
# 查看 var 目录大小
Get-ChildItem -Path "C:\ClassDrive\var" -Recurse | 
    Measure-Object -Property Length -Sum | 
    Select-Object @{Name="Size(GB)";Expression={[math]::Round($_.Sum/1GB, 2)}}
```

**定期清理**:
- 学期结束后导出重要数据
- 清空学生提交和临时文件
- 归档旧数据

---

## 8. 故障排查

### 8.1 常见问题

#### 问题 1: 程序无法启动

**错误**: `bind: address already in use`

**原因**: 端口被占用

**解决**:
```powershell
# 查找占用端口 80 的进程
netstat -ano | findstr :80

# 终止进程（替换 <PID>）
taskkill /PID <PID> /F

# 或更换端口
$env:CLASSDRIVE_PORT = "8080"
.\ClassDrive.exe
```

#### 问题 2: 学生无法访问

**检查清单**:
- [ ] 服务器程序正在运行
- [ ] 防火墙已放行端口
- [ ] IP 地址正确
- [ ] 学生电脑和服务器在同一网络

**测试连通性**:
```powershell
# 学生电脑上执行
ping 192.168.1.100

# 测试端口
Test-NetConnection -ComputerName 192.168.1.100 -Port 80
```

#### 问题 3: 上传文件失败

**可能原因**:
- 文件超过大小限制（100MB）
- 磁盘空间不足
- 网络不稳定

**检查**:
```powershell
# 查看磁盘空间
Get-PSDrive C | Select-Object Used,Free
```

#### 问题 4: 数据库损坏

**症状**: 无法登录，查询报错

**恢复**:
```powershell
# 停止服务
net stop ClassDrive

# 备份损坏的数据库
Copy-Item "var\db\classdrive.db" "var\db\classdrive.db.broken"

# 尝试修复
sqlite3 var\db\classdrive.db "PRAGMA integrity_check;"

# 如果无法修复，恢复备份
Copy-Item "D:\Backup\ClassDrive_20260613_020000.zip\var\db\classdrive.db" "var\db\classdrive.db" -Force

# 启动服务
net start ClassDrive
```

### 8.2 日志分析

**查找登录失败记录**:
```sql
sqlite3 var\db\classdrive.db

SELECT * FROM audit_login_logs 
WHERE status = 'failure' 
ORDER BY occurred_at DESC 
LIMIT 10;
```

**查找错误操作**:
```sql
SELECT * FROM audit_operation_logs 
WHERE status_code >= 400 
ORDER BY occurred_at DESC 
LIMIT 20;
```

---

## 9. 迁移与升级

### 9.1 更换服务器

**步骤**:

1. **旧服务器**:
   ```powershell
   # 停止服务
   net stop ClassDrive
   
   # 打包数据
   Compress-Archive -Path "var" -DestinationPath "ClassDrive_migration.zip"
   ```

2. **新服务器**:
   ```powershell
   # 复制程序和数据包
   Copy-Item "ClassDrive.exe" "C:\ClassDrive\"
   Copy-Item "ClassDrive_migration.zip" "C:\ClassDrive\"
   
   # 解压数据
   Expand-Archive -Path "ClassDrive_migration.zip" -DestinationPath "C:\ClassDrive\"
   
   # 启动服务
   cd C:\ClassDrive
   .\ClassDrive.exe
   ```

3. **通知用户新 IP 地址**

### 9.2 版本升级

**升级步骤**:

```powershell
# 1. 备份数据
Compress-Archive -Path "var" -DestinationPath "backup_before_upgrade.zip"

# 2. 停止服务
net stop ClassDrive

# 3. 替换 exe 文件
Copy-Item "ClassDrive_new.exe" "ClassDrive.exe" -Force

# 4. 启动服务
net start ClassDrive

# 5. 验证功能正常
```

**回滚**:
```powershell
# 停止服务
net stop ClassDrive

# 恢复旧版本
Copy-Item "ClassDrive_old.exe" "ClassDrive.exe" -Force

# 恢复数据（如果数据库结构不兼容）
Expand-Archive -Path "backup_before_upgrade.zip" -DestinationPath "." -Force

# 启动服务
net start ClassDrive
```

---

## 10. 最佳实践

### 10.1 部署前检查清单

- [ ] 服务器配置满足要求
- [ ] 网络环境稳定（优先有线）
- [ ] 已配置防火墙规则
- [ ] 已修改默认密码
- [ ] 已设置自动备份
- [ ] 已测试学生端访问

### 10.2 运行期间检查清单

- [ ] 每日检查服务运行状态
- [ ] 每周检查磁盘空间
- [ ] 每周备份数据
- [ ] 每月清理临时文件和日志
- [ ] 学期结束后归档数据

### 10.3 应急预案

**服务器故障**:
1. 准备备用服务器
2. 保留最近 3 天的备份
3. 熟悉恢复流程

**网络中断**:
1. 提前下载重要资料到本地
2. 准备 U 盘等离线传输方案

**大规模并发**:
1. 错峰安排提交时间
2. 分批次上传下载
3. 提前测试高并发场景

---

## 11. 联系支持

遇到无法解决的问题：

1. 查看 [GitHub Issues](项目地址/issues)
2. 提交新 Issue，附上：
   - ClassDrive 版本
   - 操作系统版本
   - 错误信息或日志
   - 复现步骤

---

**文档版本**: 1.0  
**最后更新**: 2026-06-13  
**维护者**: ClassDrive 开发团队
