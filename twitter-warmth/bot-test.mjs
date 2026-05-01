#!/usr/bin/env node
/**
 * Twitter/X 温暖回复机器人 - 测试版
 * 只回复@Meow5tr的推文，用于测试
 * 回复内容: 学习自Meow5tr风格的简短猫风格
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// 配置
const CONFIG = {
  apiKey: process.env.TWITTER_API_KEY || 'new1_2014c9946f134d79b5cd066c455ffaca',
  username: process.env.TWITTER_USERNAME || 'meowemiyo',
  email: process.env.TWITTER_EMAIL || 'theneko_bot@outlook.com',
  password: process.env.TWITTER_PASSWORD || 'jack306470',
  proxy: process.env.TWITTER_PROXY || 'http://sqfedmzq:vyq4gjk7sicb@31.59.20.176:6754/',
  cookieFile: '/root/.openclaw/workspace/twitter-warmth/cookie.json',
  repliedLog: '/root/.openclaw/workspace/twitter-warmth/replied.json',
  baseUrl: 'https://api.twitterapi.io/twitter',
  
  // 只监控Meow5tr
  targetUser: 'Meow5tr',
  targetUserId: '1959422320491347968',
  
  // 每次回复数量
  repliesPerRun: 3, // 测试时少发点
  
  // 回复模板 - 学习自Meow5tr风格
  templates: [
    "咪咪喵喵",
    "咪咪喵喵，抱抱你",
    "转圈圈",
    "转圈圈，猫在",
    "嗯，猫在",
    "嗯，听到了",
    "抱抱你",
    "辛苦了喵",
    "休息一下吧",
    "会过去的",
    "咪咪喵喵，懂",
    "嗯，猫也是",
    "抱抱",
    "在的喵",
    "咪咪喵喵，转圈圈"
  ]
};

// Cookie管理
async function saveCookie(cookie) {
  try {
    await fs.writeFile(CONFIG.cookieFile, JSON.stringify({
      cookie,
      savedAt: new Date().toISOString()
    }));
  } catch {}
}

async function loadCookie() {
  try {
    const data = await fs.readFile(CONFIG.cookieFile, 'utf-8');
    const parsed = JSON.parse(data);
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
    if (hoursDiff < 24) return parsed.cookie;
  } catch {}
  return null;
}

async function login() {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user_login_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.apiKey
      },
      body: JSON.stringify({
        user_name: CONFIG.username,
        email: CONFIG.email,
        password: CONFIG.password,
        proxy: CONFIG.proxy
      })
    });
    const data = await response.json();
    if (data.login_cookie || data.login_cookies) {
      const cookie = data.login_cookie || data.login_cookies;
      await saveCookie(cookie);
      return cookie;
    }
  } catch {}
  return null;
}

async function getCookie() {
  return await loadCookie() || await login();
}

// 获取用户推文
async function getUserTweets(userId) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user/last_tweets?userId=${userId}`, {
      headers: { 'X-API-Key': CONFIG.apiKey }
    });
    const data = await response.json();
    return data.data?.tweets || [];
  } catch {
    return [];
  }
}

// 获取已回复记录
async function getRepliedTweets() {
  try {
    const data = await fs.readFile(CONFIG.repliedLog, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRepliedTweet(tweetId) {
  const replied = await getRepliedTweets();
  replied.push({ id: tweetId, repliedAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(CONFIG.repliedLog), { recursive: true });
  await fs.writeFile(CONFIG.repliedLog, JSON.stringify(replied.slice(-1000), null, 2));
}

// 随机选择回复
function getRandomReply() {
  return CONFIG.templates[Math.floor(Math.random() * CONFIG.templates.length)];
}

// 回复推文
async function replyToTweet(cookie, tweetId, text, authorUsername) {
  try {
    const replyText = `@${authorUsername} ${text}`;
    const response = await fetch(`${CONFIG.baseUrl}/create_tweet_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.apiKey
      },
      body: JSON.stringify({
        tweet_text: replyText,
        proxy: CONFIG.proxy,
        login_cookies: cookie
      })
    });
    const data = await response.json();
    if (data.tweet_id) {
      console.log(`✓ 回复成功: ${tweetId}`);
      return true;
    }
    console.error(`✗ 回复失败:`, data);
  } catch (err) {
    console.error(`✗ 错误:`, err.message);
  }
  return false;
}

// 主函数
async function main() {
  console.log('🐾 Twitter回复机器人启动...');
  console.log(`⏰ ${new Date().toLocaleString()}`);
  console.log(`🎯 目标: @${CONFIG.targetUser}`);
  
  const cookie = await getCookie();
  if (!cookie) {
    console.error('✗ 无法登录');
    process.exit(1);
  }
  
  // 获取Meow5tr的推文
  console.log(`🔍 获取 @${CONFIG.targetUser} 的推文...`);
  const tweets = await getUserTweets(CONFIG.targetUserId);
  console.log(`📊 找到 ${tweets.length} 条推文`);
  
  if (tweets.length === 0) {
    console.log('⚠️ 没有推文');
    return;
  }
  
  // 过滤已回复的
  const repliedIds = new Set((await getRepliedTweets()).map(r => r.id));
  const newTweets = tweets.filter(t => !repliedIds.has(t.id));
  console.log(`📊 ${newTweets.length} 条新推文`);
  
  if (newTweets.length === 0) {
    console.log('⚠️ 没有新推文需要回复');
    return;
  }
  
  // 选择要回复的推文
  const selected = newTweets.slice(0, CONFIG.repliesPerRun);
  console.log(`💬 将回复 ${selected.length} 条`);
  
  // 回复
  let successCount = 0;
  for (const tweet of selected) {
    console.log(`  回复: ${tweet.text?.slice(0, 50)}...`);
    const replyText = getRandomReply();
    const success = await replyToTweet(cookie, tweet.id, replyText, CONFIG.targetUser);
    if (success) {
      await saveRepliedTweet(tweet.id);
      successCount++;
    }
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
  }
  
  console.log(`✅ 完成: ${successCount}/${selected.length}`);
}

main().catch(console.error);
