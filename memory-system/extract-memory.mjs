#!/usr/bin/env node
/**
 * 自动对话记忆提取器
 * 将每轮对话缩减为结构化记录
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const MEMORY_DIR = '/root/.openclaw/workspace/memory';

/**
 * 提取对话关键信息
 */
function extractConversationSummary(messages) {
  const lastMessage = messages[messages.length - 1];
  const timestamp = new Date(lastMessage.timestamp);
  
  // 提取时间
  const time = {
    date: timestamp.toISOString().split('T')[0],
    time: timestamp.toTimeString().slice(0, 5),
    full: timestamp.toISOString()
  };
  
  // 识别人物
  const participants = new Set();
  messages.forEach(m => {
    if (m.sender === 'user') participants.add('人咪');
    if (m.sender === 'assistant') participants.add('Mon3');
  });
  
  // 识别地点(渠道)
  const channel = lastMessage.channel || 'unknown';
  let location = '未知';
  if (channel.includes('qqbot')) location = 'QQ私聊';
  else if (channel.includes('telegram')) location = 'Telegram';
  else if (channel.includes('discord')) location = 'Discord';
  
  // 提取事情(对话主题)
  const content = messages.map(m => m.content).join(' ');
  const summary = generateSummary(content);
  
  // 提取关键信息点
  const keyPoints = extractKeyPoints(messages);
  
  return {
    time,
    participants: Array.from(participants).join(' / '),
    location,
    summary,
    keyPoints
  };
}

/**
 * 生成一句话摘要
 */
function generateSummary(content) {
  // 简单的关键词提取
  const keywords = [];
  
  // 检测配置相关
  if (content.includes('配置') || content.includes('设置') || content.includes('改')) {
    keywords.push('配置');
  }
  
  // 检测编程相关
  if (content.includes('代码') || content.includes('编程') || content.includes('zig') || content.includes('python')) {
    keywords.push('编程');
  }
  
  // 检测表情包相关
  if (content.includes('表情') || content.includes('情包') || content.includes('可爱')) {
    keywords.push('表情包');
  }
  
  // 检测模型相关
  if (content.includes('模型') || content.includes('model') || content.includes('reasoning')) {
    keywords.push('模型设置');
  }
  
  // 检测心跳/定时相关
  if (content.includes('心跳') || content.includes('定时') || content.includes('提醒')) {
    keywords.push('定时任务');
  }
  
  if (keywords.length > 0) {
    return `讨论${keywords.join('、')}`;
  }
  
  // 默认摘要
  return '日常对话';
}

/**
 * 提取关键信息点
 */
function extractKeyPoints(messages) {
  const points = [];
  
  messages.forEach(m => {
    const content = m.content;
    
    // 检测决策/行动
    if (content.includes('改') || content.includes('设置') || content.includes('配置')) {
      const match = content.match(/(改|设置|配置)[^。，]+/);
      if (match) points.push(match[0]);
    }
    
    // 检测完成的事项
    if (content.includes('完成') || content.includes('搞定') || content.includes('好了')) {
      points.push('✓ ' + content.slice(0, 30));
    }
    
    // 检测待办
    if (content.includes('需要') || content.includes('待办') || content.includes('TODO')) {
      points.push('⏳ ' + content.slice(0, 30));
    }
  });
  
  // 去重并限制数量
  return [...new Set(points)].slice(0, 5);
}

/**
 * 格式化记录为Markdown
 */
function formatRecord(summary) {
  const { time, participants, location, summary: topic, keyPoints } = summary;
  
  let md = `## [${time.time}] ${topic}\n\n`;
  md += `- **时间**: ${time.date} ${time.time}\n`;
  md += `- **人物**: ${participants}\n`;
  md += `- **地点**: ${location}\n`;
  md += `- **事情**: ${topic}\n\n`;
  
  if (keyPoints.length > 0) {
    md += `**详细**:\n`;
    keyPoints.forEach(point => {
      md += `- ${point}\n`;
    });
    md += '\n';
  }
  
  return md;
}

/**
 * 写入记忆文件
 */
async function saveToMemory(record) {
  const today = new Date().toISOString().split('T')[0];
  const filePath = path.join(MEMORY_DIR, `${today}.md`);
  
  // 确保目录存在
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
  } catch {}
  
  // 检查文件是否存在
  let existing = '';
  try {
    existing = await fs.readFile(filePath, 'utf-8');
  } catch {}
  
  // 如果没有文件头,添加
  if (!existing.includes('# 每日记忆')) {
    existing = `# 每日记忆 - ${today}\n\n${existing}`;
  }
  
  // 追加记录
  const updated = existing + '\n' + record;
  await fs.writeFile(filePath, updated, 'utf-8');
  
  console.log(`✓ 已记录到 ${filePath}`);
}

/**
 * 主函数 - 处理传入的对话数据
 */
async function main() {
  // 从标准输入读取对话数据(JSON格式)
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', async () => {
    try {
      const messages = JSON.parse(input);
      const summary = extractConversationSummary(messages);
      const record = formatRecord(summary);
      await saveToMemory(record);
    } catch (err) {
      console.error('处理失败:', err.message);
      process.exit(1);
    }
  });
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractConversationSummary, formatRecord, saveToMemory };
