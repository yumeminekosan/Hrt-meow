#!/usr/bin/env node
/**
 * 智能上下文管理器 - 自动版
 * - 每次对话check，超过8192字符自动reset
 * - 按需检索历史内容
 * - reset后标记需要心跳
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CONFIG = {
  logDir: '/root/.openclaw/workspace/memory/context-logs',
  lastResetFile: '/root/.openclaw/workspace/memory/.last-reset',
  contextSizeFile: '/root/.openclaw/workspace/memory/.context-size',
  heartbeatFlagFile: '/root/.openclaw/workspace/memory/.needs-heartbeat',
  maxContextChars: 8192,
  maxLogs: 10,
  // 每轮对话估算增量（消息+回复），用于无法精确测量时的兜底
  estimatePerTurn: 800
};

// 确保目录存在
async function ensureDir() {
  await fs.mkdir(CONFIG.logDir, { recursive: true });
}

// 读取当前上下文大小估算值
async function getContextSize() {
  try {
    const data = await fs.readFile(CONFIG.contextSizeFile, 'utf-8');
    return parseInt(data.trim(), 10);
  } catch {
    return 0;
  }
}

// 更新上下文大小
async function setContextSize(size) {
  await fs.writeFile(CONFIG.contextSizeFile, String(size));
}

// 获取上次reset时间
async function getLastReset() {
  try {
    const data = await fs.readFile(CONFIG.lastResetFile, 'utf-8');
    return new Date(data.trim());
  } catch {
    return new Date(0);
  }
}

// 记录reset时间
async function setLastReset() {
  await fs.writeFile(CONFIG.lastResetFile, new Date().toISOString());
}

// 标记需要心跳
async function flagHeartbeat() {
  await fs.writeFile(CONFIG.heartbeatFlagFile, new Date().toISOString());
}

// 检查是否需要心跳
async function needsHeartbeat() {
  try {
    await fs.access(CONFIG.heartbeatFlagFile);
    return true;
  } catch {
    return false;
  }
}

// 清除心跳标记
async function clearHeartbeat() {
  try {
    await fs.unlink(CONFIG.heartbeatFlagFile);
  } catch {}
}

// 生成会话摘要
async function createSummary() {
  await ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(CONFIG.logDir, `${timestamp}.md`);
  
  const summary = `# 会话摘要 - ${new Date().toLocaleString('zh-CN')}

## 关键话题
- 

## 待办/提醒
- 

## 重要决策
- 
`;
  
  await fs.writeFile(logFile, summary);
  await cleanupOldLogs();
  
  return logFile;
}

// 清理旧日志
async function cleanupOldLogs() {
  try {
    const files = await fs.readdir(CONFIG.logDir);
    const sorted = files
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    
    for (const file of sorted.slice(CONFIG.maxLogs)) {
      await fs.unlink(path.join(CONFIG.logDir, file));
    }
  } catch {}
}

// 执行reset
async function doReset(sizeBefore) {
  const logFile = await createSummary();
  await setLastReset();
  await setContextSize(0);
  await flagHeartbeat();
  
  return {
    reset: true,
    logFile,
    sizeBefore,
    message: `上下文已达${sizeBefore}字符(>${CONFIG.maxContextChars})，自动压缩并生成摘要: ${logFile}`
  };
}

// 搜索日志内容
async function searchLogs(keyword) {
  try {
    const files = await fs.readdir(CONFIG.logDir);
    const results = [];
    
    for (const file of files.filter(f => f.endsWith('.md')).sort()) {
      const content = await fs.readFile(path.join(CONFIG.logDir, file), 'utf-8');
      
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        const lines = content.split('\n');
        const matches = [];
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            matches.push(lines.slice(start, end).join('\n'));
          }
        }
        
        if (matches.length > 0) {
          results.push({ file, matches });
        }
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// 获取所有日志
async function getAllLogs() {
  try {
    const files = await fs.readdir(CONFIG.logDir);
    const logs = [];
    
    for (const file of files.filter(f => f.endsWith('.md')).sort().reverse()) {
      const content = await fs.readFile(path.join(CONFIG.logDir, file), 'utf-8');
      const stat = await fs.stat(path.join(CONFIG.logDir, file));
      logs.push({ 
        file, 
        content,
        time: stat.mtime
      });
    }
    
    return logs;
  } catch {
    return [];
  }
}

// 主函数
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'check': {
      const currentSize = await getContextSize();
      const newSize = currentSize + CONFIG.estimatePerTurn;
      await setContextSize(newSize);
      
      if (newSize >= CONFIG.maxContextChars) {
        const result = await doReset(newSize);
        console.log(JSON.stringify(result));
      } else {
        console.log(JSON.stringify({ reset: false, estimatedSize: newSize }));
      }
      break;
    }
    
    case 'tick': {
      // 手动增加上下文字符计数（消息实际长度）
      const chars = parseInt(arg, 10) || CONFIG.estimatePerTurn;
      const currentSize = await getContextSize();
      const newSize = currentSize + chars;
      await setContextSize(newSize);
      
      if (newSize >= CONFIG.maxContextChars) {
        const result = await doReset(newSize);
        console.log(JSON.stringify(result));
      } else {
        console.log(JSON.stringify({ reset: false, estimatedSize: newSize }));
      }
      break;
    }
    
    case 'heartbeat-check': {
      const heartbeat = await needsHeartbeat();
      console.log(JSON.stringify({ needsHeartbeat: heartbeat }));
      break;
    }
    
    case 'heartbeat-done': {
      await clearHeartbeat();
      console.log(JSON.stringify({ cleared: true }));
      break;
    }
    
    case 'search':
      if (!arg) {
        console.error('Usage: node context-manager.mjs search <keyword>');
        process.exit(1);
      }
      const results = await searchLogs(arg);
      console.log(JSON.stringify(results, null, 2));
      break;
      
    case 'logs':
      const logs = await getAllLogs();
      console.log(JSON.stringify(logs.map(l => ({
        file: l.file,
        time: l.time,
        preview: l.content.slice(0, 200) + '...'
      })), null, 2));
      break;
      
    case 'status': {
      const lastReset = await getLastReset();
      const currentSize = await getContextSize();
      const hb = await needsHeartbeat();
      
      console.log(JSON.stringify({
        lastReset: lastReset.toISOString(),
        estimatedContextSize: currentSize,
        maxSize: CONFIG.maxContextChars,
        remaining: Math.max(0, CONFIG.maxContextChars - currentSize),
        needsHeartbeat: hb
      }, null, 2));
      break;
    }
      
    default:
      console.log(JSON.stringify({ reset: false }));
  }
}

main().catch(console.error);
