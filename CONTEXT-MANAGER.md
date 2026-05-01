# 智能上下文管理

## 工作原理

1. **自动检测**: 每次对话时检查是否超过4小时
2. **自动Reset**: 超时后提示 `CONTEXT_RESET_REQUIRED`
3. **摘要生成**: Reset前生成关键信息摘要
4. **按需检索**: 人咪提到过去内容时自动搜索

## 人咪的使用方式

### 正常对话
- 猫自动检查时间,超过4小时会提示需要reset
- 人咪可以说 "reset" 或 "重置" 来确认

### 提及过去内容
当人说 "之前说的xxx" / "4小时前的xxx" / "还记得xxx吗":
- 猫自动搜索日志
- 从摘要中提取相关信息回复

### 手动操作
```bash
# 检查是否需要reset
node /root/.openclaw/workspace/scripts/context-manager.mjs check

# 记录reset时间
node /root/.openclaw/workspace/scripts/context-manager.mjs reset

# 保存摘要
node /root/.openclaw/workspace/scripts/context-manager.mjs summary "关键信息..."

# 搜索历史
node /root/.openclaw/workspace/scripts/context-manager.mjs search "关键词"

# 列出所有日志
node /root/.openclaw/workspace/scripts/context-manager.mjs list
```

## 文件位置

- 管理脚本: `/root/.openclaw/workspace/scripts/context-manager.mjs`
- 日志目录: `/root/.openclaw/workspace/memory/context-logs/`
- 时间记录: `/root/.openclaw/workspace/memory/.last-reset`
