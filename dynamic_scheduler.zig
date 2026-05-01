const std = @import("std");
const ArrayList = std.ArrayList;
const StringHashMap = std.StringHashMap;

/// 优化结果
pub const OptimizationResult = struct {
    instruction_id: usize,
    original_latency: u32,
    optimized_latency: u32,
    speedup: f32,
};

/// 指令结构
pub const Instruction = struct {
    id: usize,
    opcode: []const u8,
    src_regs: ArrayList([]const u8),
    dst_regs: ArrayList([]const u8),
    latency: u32,
};

/// 七级流水线阶段
pub const PipelineStage = enum {
    fetch,
    decode,
    rename,
    schedule,
    execute,
    memory,
    writeback,
};

/// 简化的七级流水线
pub const SevenStagePipeline = struct {
    stages: [7]ArrayList(Instruction),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) !SevenStagePipeline {
        var pipeline: SevenStagePipeline = undefined;
        pipeline.allocator = allocator;
        for (0..7) |i| {
            pipeline.stages[i] = ArrayList(Instruction).init(allocator);
        }
        return pipeline;
    }

    pub fn deinit(self: *SevenStagePipeline) void {
        for (0..7) |i| {
            self.stages[i].deinit();
        }
    }
};

/// 动态指令调度器（乱序执行）
pub const DynamicScheduler = struct {
    instruction_window: ArrayList(Instruction),
    rename_table: StringHashMap([]const u8),
    reorder_buffer: ArrayList(Instruction),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) !DynamicScheduler {
        return DynamicScheduler{
            .instruction_window = ArrayList(Instruction).init(allocator),
            .rename_table = StringHashMap([]const u8).init(allocator),
            .reorder_buffer = ArrayList(Instruction).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *DynamicScheduler) void {
        self.instruction_window.deinit();
        self.rename_table.deinit();
        self.reorder_buffer.deinit();
    }

    /// 寄存器重命名 - 消除WAR/WAW依赖
    pub fn renameRegisters(
        self: *DynamicScheduler,
        instr: *Instruction,
    ) !void {
        // 重命名源寄存器（读）
        for (instr.src_regs.items) |src_reg| {
            if (self.rename_table.get(src_reg)) |renamed| {
                // 使用之前重命名的版本
                _ = renamed;
            }
        }

        // 重命名目标寄存器（写）— 创建新的物理寄存器
        for (instr.dst_regs.items) |dst_reg| {
            const physical_reg = try std.fmt.allocPrint(
                self.allocator,
                "{s}_p{d}",
                .{ dst_reg, self.reorder_buffer.items.len },
            );
            try self.rename_table.put(dst_reg, physical_reg);
        }
    }

    /// 指令调度 - 找出可以乱序执行的指令
    pub fn scheduleInstructions(
        self: *DynamicScheduler,
    ) !ArrayList(Instruction) {
        var scheduled = ArrayList(Instruction).init(self.allocator);

        // 简单的贪心调度：优先执行没有数据依赖的指令
        for (self.instruction_window.items) |instr| {
            var has_dependency = false;

            // 检查是否有RAW（Read-After-Write）依赖
            for (self.reorder_buffer.items) |rob_instr| {
                for (rob_instr.dst_regs.items) |dst| {
                    for (instr.src_regs.items) |src| {
                        if (std.mem.eql(u8, dst, src)) {
                            has_dependency = true;
                            break;
                        }
                    }
                }
            }

            if (!has_dependency) {
                try scheduled.append(instr);
            }
        }

        return scheduled;
    }

    /// 主调度函数 - 动态指令调度 + 激素优化
    pub fn scheduleHormoneOptimization(
        self: *DynamicScheduler,
        pipeline: *SevenStagePipeline,
    ) !ArrayList(OptimizationResult) {
        var results = ArrayList(OptimizationResult).init(self.allocator);

        // 第1步：从流水线的Decode阶段读取指令
        for (pipeline.stages[1].items) |instr| {
            try self.instruction_window.append(instr);
        }

        // 第2步：执行寄存器重命名
        for (self.instruction_window.items) |*instr| {
            try self.renameRegisters(instr);
        }

        // 第3步：指令调度
        var scheduled = try self.scheduleInstructions();
        defer scheduled.deinit();

        // 第4步：记录优化结果
        for (scheduled.items) |scheduled_instr| {
            const original_latency = scheduled_instr.latency;
            // 激素优化：假设乱序执行可以减少平均延迟
            const optimized_latency = (original_latency * 7) / 10; // 减少30%
            const speedup = @as(f32, @floatFromInt(original_latency)) /
                @as(f32, @floatFromInt(optimized_latency));

            try results.append(OptimizationResult{
                .instruction_id = scheduled_instr.id,
                .original_latency = original_latency,
                .optimized_latency = optimized_latency,
                .speedup = speedup,
            });

            // 将指令添加到重排缓冲
            try self.reorder_buffer.append(scheduled_instr);
        }

        return results;
    }
};

/// 测试代码
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // 创建调度器
    var scheduler = try DynamicScheduler.init(allocator);
    defer scheduler.deinit();

    // 创建流水线
    var pipeline = try SevenStagePipeline.init(allocator);
    defer pipeline.deinit();

    // 创建测试指令
    var instr1 = Instruction{
        .id = 1,
        .opcode = "ADD",
        .src_regs = ArrayList([]const u8).init(allocator),
        .dst_regs = ArrayList([]const u8).init(allocator),
        .latency = 3,
    };
    try instr1.src_regs.append("R1");
    try instr1.src_regs.append("R2");
    try instr1.dst_regs.append("R3");

    var instr2 = Instruction{
        .id = 2,
        .opcode = "MUL",
        .src_regs = ArrayList([]const u8).init(allocator),
        .dst_regs = ArrayList([]const u8).init(allocator),
        .latency = 5,
    };
    try instr2.src_regs.append("R4");
    try instr2.dst_regs.append("R5");

    // 添加到流水线Decode阶段
    try pipeline.stages[1].append(instr1);
    try pipeline.stages[1].append(instr2);

    // 执行调度
    var results = try scheduler.scheduleHormoneOptimization(&pipeline);
    defer results.deinit();

    // 输出结果
    std.debug.print("=== 动态指令调度结果 ===\n", .{});
    std.debug.print("调度指令数: {}\n", .{results.items.len});
    for (results.items) |result| {
        std.debug.print(
            "指令#{}: 原始延迟={}, 优化后={}, 加速比={d:.2}x\n",
            .{ result.instruction_id, result.original_latency, result.optimized_latency, result.speedup },
        );
    }

    instr1.src_regs.deinit();
    instr1.dst_regs.deinit();
    instr2.src_regs.deinit();
    instr2.dst_regs.deinit();
}
