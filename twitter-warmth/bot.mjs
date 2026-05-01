#!/usr/bin/env node
/**
 * Twitter/X 温暖回复机器人 (使用 twitterapi.io)
 * 每45分钟随机回复10条用户名带🍥用户的负面情感推文
 * 回复内容: 简短猫风格情感支持 + By Mon3
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// 配置
const CONFIG = {
  // twitterapi.io API Key
  apiKey: process.env.TWITTER_API_KEY || 'new1_2014c9946f134d79b5cd066c455ffaca',
  
  // 账号信息
  username: process.env.TWITTER_USERNAME || 'meowemiyo',
  email: process.env.TWITTER_EMAIL || 'theneko_bot@outlook.com',
  password: process.env.TWITTER_PASSWORD || 'jack306470',
  proxy: process.env.TWITTER_PROXY || 'http://sqfedmzq:vyq4gjk7sicb@31.59.20.176:6754/',
  
  // Cookie保存文件
  cookieFile: '/root/.openclaw/workspace/twitter-warmth/cookie.json',
  
  // 搜索关键词: 用户名包含🍥
  searchQuery: '🍥',
  
  // 测试用户
  testUser: 'StarNekOvO',

  // 目标账号: Meow5tr
  targetUsername: 'Meow5tr',
  
  // 每次回复数量
  repliesPerRun: 10,
  
  // 已回复记录文件
  repliedLog: '/root/.openclaw/workspace/twitter-warmth/replied.json',
  
  // API基础URL
  baseUrl: 'https://api.twitterapi.io/twitter',
  
  // 负面情感关键词
  negativeKeywords: ['难过', '伤心', '痛苦', '绝望', '孤独', '累', '想哭', '抑郁', '焦虑', 'stress', 'sad', 'lonely', 'depressed', 'anxious', 'tired', 'hurt', 'pain', 'cry', 'upset', '😢', '😭', '💔', '😞'],
  
  // 回复模板 - 学习自Meow5tr和hoshishigure_的风格
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

/**
 * 保存Cookie到文件
 */
async function saveCookie(cookie) {
  try {
    await fs.writeFile(CONFIG.cookieFile, JSON.stringify({
      cookie,
      savedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.error('保存Cookie失败:', err.message);
  }
}

/**
 * 从文件读取Cookie
 */
async function loadCookie() {
  try {
    const data = await fs.readFile(CONFIG.cookieFile, 'utf-8');
    const parsed = JSON.parse(data);
    // 检查Cookie是否过期(24小时)
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      console.log('✓ 使用已保存的Cookie');
      return parsed.cookie;
    }
    console.log('⚠️ Cookie已过期,重新登录');
    return null;
  } catch {
    return null;
  }
}

/**
 * 登录获取cookie
 */
async function login() {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/twitter/user_login_v2`, {
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
      console.log('✓ 登录成功');
      const cookie = data.login_cookie || data.login_cookies;
      await saveCookie(cookie);
      return cookie;
    } else {
      console.error('✗ 登录失败:', data);
      return null;
    }
  } catch (err) {
    console.error('登录错误:', err.message);
    return null;
  }
}

/**
 * 获取或创建Cookie
 */
async function getCookie() {
  // 先尝试加载已保存的Cookie
  const savedCookie = await loadCookie();
  if (savedCookie) {
    return savedCookie;
  }
  // 否则重新登录
  return await login();
}

/**
 * 搜索推文
 */
async function searchTweets(cookie) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/search?query=${encodeURIComponent(CONFIG.searchQuery)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': CONFIG.apiKey,
        'Cookie': cookie
      }
    });
    
    const data = await response.json();
    return data.data || data.tweets || [];
  } catch (err) {
    console.error('搜索失败:', err.message);
    return [];
  }
}

/**
 * 获取用户ID
 */
async function getUserId(cookie, username) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user/info?userName=${username}`, {
      method: 'GET',
      headers: {
        'X-API-Key': CONFIG.apiKey,
        'Cookie': cookie
      }
    });
    
    const data = await response.json();
    const userId = data.data?.id || data.id;
    console.log(`获取用户 ${username}:`, userId || '未找到');
    return userId;
  } catch (err) {
    console.error('获取用户ID失败:', err.message);
    return null;
  }
}

/**
 * 获取关注者列表
 */
async function getFollowers(userName) {
  try {
    const url = `${CONFIG.baseUrl}/user/followers?userName=${userName}`;
    console.log('请求URL:', url);
    console.log('API Key:', CONFIG.apiKey.slice(0, 10) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': CONFIG.apiKey
      }
    });

    console.log('响应状态:', response.status);
    const data = await response.json();
    console.log('完整响应:', JSON.stringify(data).slice(0, 500));
    const followers = data.followers || [];
    console.log(`找到 ${followers.length} 个关注者`);
    return followers;
  } catch (err) {
    console.error('获取关注者失败:', err.message);
    return [];
  }
}

/**
 * 获取用户推文
 */
async function getUserTweets(cookie, userId) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/user/last_tweets?userId=${userId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': CONFIG.apiKey,
        'Cookie': cookie
      }
    });

    const data = await response.json();
    // 数据在 data.data.tweets
    return data.data?.tweets || data.data || data.tweets || [];
  } catch (err) {
    console.error(`获取用户 ${userId} 推文失败:`, err.message);
    return [];
  }
}

/**
 * 检测是否为负面情感推文
 */
function isNegativeTweet(tweet) {
  const text = (tweet.text || tweet.full_text || '').toLowerCase();
  return CONFIG.negativeKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * 获取已回复的推文ID列表
 */
async function getRepliedTweets() {
  try {
    const data = await fs.readFile(CONFIG.repliedLog, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 保存已回复的推文ID
 */
async function saveRepliedTweet(tweetId) {
  const replied = await getRepliedTweets();
  replied.push({
    id: tweetId,
    repliedAt: new Date().toISOString()
  });
  
  // 只保留最近1000条记录
  const trimmed = replied.slice(-1000);
  
  await fs.mkdir(path.dirname(CONFIG.repliedLog), { recursive: true });
  await fs.writeFile(CONFIG.repliedLog, JSON.stringify(trimmed, null, 2));
}

/**
 * 随机选择回复模板
 */
function getRandomReply() {
  const index = Math.floor(Math.random() * CONFIG.templates.length);
  return CONFIG.templates[index];
}

/**
 * 回复推文
 */
async function replyToTweet(cookie, tweetId, text) {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/create_tweet_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.apiKey
      },
      body: JSON.stringify({
        tweet_text: text,
        proxy: CONFIG.proxy,
        login_cookies: cookie,
        reply_to_tweet_id: tweetId
      })
    });

    const data = await response.json();

    if (data.tweet_id || data.data?.id) {
      console.log(`✓ 回复成功: ${tweetId}`);
      return true;
    } else {
      console.error(`✗ 回复失败 ${tweetId}:`, data);
      return false;
    }
  } catch (err) {
    console.error(`✗ 回复错误 ${tweetId}:`, err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🐾 Twitter温暖回复机器人启动...');
  console.log(`⏰ ${new Date().toLocaleString()}`);
  
  // 获取Cookie(自动处理登录)
  const cookie = await getCookie();
  if (!cookie) {
    console.error('✗ 无法获取Cookie,退出');
    process.exit(1);
  }
  
  // 获取Meow5tr的关注者
  console.log('👥 获取 @Meow5tr 的关注者列表...');
  const followers = await getFollowers(CONFIG.targetUsername);

  if (followers.length === 0) {
    console.log('⚠️ 没有找到关注者');
    return;
  }

  // 筛选用户名带🍥的关注者
  const transFollowers = followers.filter(f => {
    const name = f.name || f.userName || f.screen_name || '';
    return name.includes('🍥');
  });

  console.log(`📊 找到 ${transFollowers.length} 个带🍥的关注者`);

  if (transFollowers.length === 0) {
    console.log('⚠️ 没有找到带🍥的关注者');
    return;
  }

  // 获取已回复列表
  const repliedIds = new Set((await getRepliedTweets()).map(r => r.id));

  // 收集所有负面推文
  console.log('🔍 扫描关注者的推文...');
  let negativeTweets = [];

  for (const follower of transFollowers.slice(0, 20)) { // 只检查前20个
    const userId = follower.id;
    const userName = follower.userName || follower.screen_name;

    console.log(`  检查 @${userName}...`);
    const tweets = await getUserTweets(cookie, userId);

    for (const tweet of tweets) {
      if (isNegativeTweet(tweet) && !repliedIds.has(tweet.id)) {
        negativeTweets.push({
          ...tweet,
          author_username: userName
        });
      }
    }

    // 延迟1秒,避免触发限制
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`📊 ${negativeTweets.length} 条负面情感推文`);

  if (negativeTweets.length === 0) {
    console.log('⚠️ 没有需要回复的推文');
    return;
  }

  // 随机选择10条(或更少)
  const shuffled = negativeTweets.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, CONFIG.repliesPerRun);
  
  console.log(`💬 将回复 ${selected.length} 条推文`);
  
  // 回复每条推文
  let successCount = 0;
  for (const tweet of selected) {
    console.log(`  回复: ${tweet.text?.slice(0, 50)}...`);
    const replyText = getRandomReply();
    const success = await replyToTweet(cookie, tweet.id, replyText);

    if (success) {
      await saveRepliedTweet(tweet.id);
      successCount++;
    }

    // 延迟5-10秒,避免触发限制
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
  }
  
  console.log(`✅ 完成: ${successCount}/${selected.length} 条回复成功`);
}

// 运行
main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
