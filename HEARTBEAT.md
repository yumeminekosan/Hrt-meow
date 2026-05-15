# HEARTBEAT.md

## 定时提醒

- **早上8点** - 提醒人咪看源石培养皿

## 自动上下文管理 (8192字符限制)

**每次收到消息时自动执行:**
```bash
node /root/.openclaw/workspace/scripts/context-manager.mjs check
```

如果返回 `{"reset":true}`, 猫自动:
1. 生成摘要日志到 `/memory/context-logs/`
2. 执行 `/reset` 清空对话
3. 心跳检查：执行 `node /root/.openclaw/workspace/scripts/context-manager.mjs heartbeat-check`
4. 如果 `needsHeartbeat: true`，猫自动重新读取 SOUL.md + IDENTITY.md，以当前身份简要确认自己（如"猫醒了，Mon3，记得人咪"），然后执行 `heartbeat-done` 清除标记
5. 基于摘要继续对话

**手动记录上下文长度:** (用于消息实际字符数跟踪)
```bash
node /root/.openclaw/workspace/scripts/context-manager.mjs tick <字符数>
```

**人咪提到过去内容时**,猫自动搜索日志并回复.

**查看状态:**
```bash
node /root/.openclaw/workspace/scripts/context-manager.mjs status
```

## 2小时沉默心跳

每次收到消息时,猫检查 `memory/last-active.txt`:
```bash
cat /root/.openclaw/workspace/memory/last-active.txt 2>/dev/null || echo 0
```
如果距上次活跃时间 > 2小时 (7200秒):
1. 重新读取 SOUL.md + IDENTITY.md
2. 简短确认身份 (如 "猫醒了, Mon3, 记得人咪")
3. 更新 `memory/last-active.txt` 为当前时间戳

每次正常回复后也更新时间戳:
```bash
date +%s > /root/.openclaw/workspace/memory/last-active.txt
```
