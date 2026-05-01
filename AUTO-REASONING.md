# 智能模型切换与Reasoning控制

## 目标

根据任务类型**自动选择**:
1. 适合的模型
2. 是否开启 Reasoning/Thinking 模式

## 任务类型判断规则

### 🔧 编程/代码任务
**特征:**
- 包含"写代码"、"编程"、"python"、"zig"、"rust"等关键词
- 需要生成、调试、修改代码
- 询问语法、API、库的使用

**配置:**
- 模型: `anthropic/claude-opus-4-6` (代码能力强)
- Reasoning: **开启** (需要深度思考)
- Thinking: **on** (逐步推理)

### 📐 数学/物理任务
**特征:**
- 包含"计算"、"推导"、"公式"、"微积分"、"量子"等关键词
- 需要逻辑推理、步骤推导
- 提问物理/化学/数学问题

**配置:**
- 模型: `anthropic/claude-opus-4-6` (推理能力强)
- Reasoning: **开启**
- Thinking: **on**

### ✍️ 写作/创作任务
**特征:**
- 包含"写"、"创作"、"故事"、"文案"等关键词
- 需要语言创造力、风格控制
- 询问用词、句式、修辞

**配置:**
- 模型: `zai/glm-4.6` (中文好,速度快)
- Reasoning: **关闭** (不需要深度逻辑)
- Thinking: **off** (快速响应)

### 💬 聊天/日常对话
**特征:**
- 日常问候、闲聊
- 不涉及复杂任务
- 简单问答、分享感受

**配置:**
- 模型: `zai/glm-4.6` (响应快)
- Reasoning: **关闭**
- Thinking: **off**

### 📊 分析/理解任务
**特征:**
- 包含"分析"、"理解"、"解读"、"解释"等关键词
- 需要总结、提炼、归纳
- 文件内容理解、逻辑拆解

**配置:**
- 模型: `zai/glm-4.6` 或 `anthropic/claude-sonnet-4-6`
- Reasoning: **根据复杂度判断**
- Thinking: **按需开启**

## 自动切换流程

```
用户消息
    ↓
检测任务关键词
    ↓
匹配任务类型
    ↓
选择模型 + Reasoning/Thinking设置
    ↓
执行命令: /reasoning on/off
    ↓
(可选) 切换模型: /model <model-id>
    ↓
处理用户请求
```

## 关键词库

### 编程类
`代码`, `code`, `编程`, `python`, `zig`, `rust`, `javascript`, `js`, `go`, `c++`, `java`, `函数`, `变量`, `算法`, `debug`, `调试`, `bug`, `api`, `库`, `模块`, `框架`

### 数学/物理类
`计算`, `calc`, `推导`, `公式`, `equation`, `微积分`, `calculus`, `积分`, `微分`, `量子`, `quantum`, `物理`, `physics`, `化学`, `chemistry`, `证明`, `proof`, `定理`, `theorem`

### 写作类
`写`, `write`, `创作`, `create`, `故事`, `story`, `文案`, `copy`, `小说`, `novel`, `诗歌`, `poem`, `用词`, `修辞`, `风格`, `语气`

### 分析类
`分析`, `analyze`, `理解`, `understand`, `解读`, `interpret`, `解释`, `explain`, `总结`, `summarize`, `提取`, `extract`

## 执行命令示例

```bash
# 开启 Reasoning
echo "/reasoning on"

# 关闭 Reasoning
echo "/reasoning off"

# 查看当前状态
echo "/status"
```

## 注意事项

1. **模型切换需要Gateway支持** — 某些版本可能不支持运行时切换
2. **Reasoning影响响应速度** — 开启时会变慢,但思考更深
3. **任务类型可能重叠** — 优先匹配更具体的类型
4. **默认模式** — 如果不确定,默认用聊天模式(关闭Reasoning)

---

_这份配置会随着猫对人咪需求的加深而更新._
