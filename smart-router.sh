#!/bin/bash
# OpenClaw 智能任务路由器
# 根据任务类型自动开启/关闭 Reasoning 模式

# 配置
CHAT_MODEL="zai/glm-4.6"
REASONING_MODEL="anthropic/claude-opus-4-6"

# 任务检测函数
detect_task_type() {
    local text="$1"

    # 编程/代码任务
    if echo "$text" | grep -qE "代码|code|编程|python|zig|rust|javascript|js|go|c\+\+|java|函数|变量|算法|debug|调试|bug|api|库|模块|框架"; then
        echo "coding"
        return
    fi

    # 数学/物理任务
    if echo "$text" | grep -qE "计算|calc|推导|公式|equation|微积分|calculus|积分|微分|量子|quantum|物理|physics|化学|chemistry|证明|proof|定理|theorem"; then
        echo "math"
        return
    fi

    # 写作/创作任务
    if echo "$text" | grep -qE "写|write|创作|create|故事|story|文案|copy|小说|novel|诗歌|poem|用词|修辞|风格|语气"; then
        echo "writing"
        return
    fi

    # 分析/理解任务
    if echo "$text" | grep -qE "分析|analyze|理解|understand|解读|interpret|解释|explain|总结|summarize|提取|extract"; then
        echo "analysis"
        return
    fi

    # 默认: 聊天
    echo "chat"
}

# Reasoning 控制函数
set_reasoning() {
    local enable="$1"
    echo "🔄 Reasoning: $enable"
    # 这里需要调用 OpenClaw 的 reasoning 命令
    # 目前版本可能不支持通过脚本切换
    # 需要手动执行: /reasoning on 或 /reasoning off
}

# 模型选择函数
select_model() {
    local task_type="$1"

    case "$task_type" in
        coding|math)
            echo "$REASONING_MODEL"
            ;;
        *)
            echo "$CHAT_MODEL"
            ;;
    esac
}

# 主逻辑
if [ -z "$1" ]; then
    echo "用法: $0 \"用户输入文本\""
    echo ""
    echo "示例:"
    echo "  $0 \"帮我写一个 python 脚本\""
    echo "  $0 \"计算一下这个积分\""
    echo "  $0 \"今天天气怎么样\""
    exit 1
fi

USER_INPUT="$1"
TASK_TYPE=$(detect_task_type "$USER_INPUT")
MODEL=$(select_model "$TASK_TYPE")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 任务类型: $TASK_TYPE"
echo "🤖 推荐模型: $MODEL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Reasoning 决策
case "$TASK_TYPE" in
    coding|math)
        set_reasoning "开启"
        ;;
    *)
        set_reasoning "关闭"
        ;;
esac

echo ""
echo "💡 提示: 如果 OpenClaw 支持运行时切换,请执行:"
echo "   /reasoning $( [ "$TASK_TYPE" = "coding" ] || [ "$TASK_TYPE" = "math" ] && echo "on" || echo "off" )"
echo "   /model $MODEL"
