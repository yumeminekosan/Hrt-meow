# pk-engine

基于MIPS分层架构的PK/PD模拟引擎——将求解器与模型参数完全解耦

## 引擎层（不可变）

- 从ROM加载参数（TOML固件文件→结构化参数对象）
- 初始化求解器（设定步长、容差、积分方法）
- 执行一步数值积分（接收当前状态，返回下一状态）
- 输出带时间戳的状态向量
- 管理模拟生命周期：setup → step → collect → teardown
- 对固件模块进行自检和验证

## 固件层（可插拔）

- 一个TOML文件 + 一个实现了固定接口的类
- 例子：estradiol_valerate_IM.toml + class DepotInjectionModule
- TOML定义模型参数（房室、速率常数、初始条件）
- 类实现IPKModule接口，提供computeDerivatives/getInitialState/selfTest
- 固件可热插拔：换一个TOML+类组合即换一个药物模型
- 固件自带假设标签（assumptionTags），用于融合控制器的模型选择
