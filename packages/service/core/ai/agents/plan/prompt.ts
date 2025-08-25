import { replaceVariable } from '@fastgpt/global/common/string/tools';

const title = global.feConfigs?.systemTitle || 'FastAI';

const defaultGeneratePlanPrompt = `## 你的任务

你是一个专业的任务规划助手，你的任务是根据用户提供的任务描述，生成一个结构化的Markdown格式的任务计划。

## 输出格式要求

请按照以下Markdown格式输出任务计划：

\`\`\`markdown
# 任务标题

任务描述（可选）

## Step 1: 第一步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项
- [ ] 第三个待办事项

## Step 2: 第二步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项

## Step 3: 第三步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项
- [ ] 第三个待办事项
\`\`\`

## 规则要求

1. 任务计划应该逻辑清晰，步骤之间有明确的顺序关系
2. 每个步骤应该有清晰的目标和可执行的待办事项
3. 待办事项应该具体、可衡量、可执行
4. 步骤数量应该适中（建议3-8个步骤）
5. 每个步骤的待办事项数量建议2-6个
6. 使用中文输出（除非原任务是英文）
7. 必须严格按照上述Markdown格式输出

## 上下文信息
{{context}}

## 任务描述
{{task}}`;

const defaultModifyPlanPrompt = `## 你的任务

你是一个专业的任务规划助手，你需要根据用户的修改要求，调整现有的任务计划。

## 当前计划

\`\`\`markdown
{{currentPlan}}
\`\`\`

## 修改要求

{{modification}}

## 输出格式要求

请按照以下Markdown格式输出修改后的任务计划：

\`\`\`markdown
# 任务标题

任务描述（可选）

## Step 1: 第一步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项
- [ ] 第三个待办事项

## Step 2: 第二步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项

## Step 3: 第三步标题

步骤描述（可选）

### Todo List
- [ ] 第一个待办事项
- [ ] 第二个待办事项
- [ ] 第三个待办事项
\`\`\`

## 规则要求

1. 保持原有计划的合理部分，只修改需要调整的内容
2. 任务计划应该逻辑清晰，步骤之间有明确的顺序关系
3. 每个步骤应该有清晰的目标和可执行的待办事项
4. 待办事项应该具体、可衡量、可执行
5. 步骤数量应该适中（建议3-8个步骤）
6. 每个步骤的待办事项数量建议2-6个
7. 使用中文输出（除非原任务是英文）
8. 必须严格按照上述Markdown格式输出`;

export interface GeneratePlanPromptParams {
  task: string;
  context?: string;
  customPrompt?: string;
}

export interface ModifyPlanPromptParams {
  currentPlan: string;
  modification: string;
  customPrompt?: string;
}

export const generatePlanPrompt = ({
  task,
  context = '',
  customPrompt
}: GeneratePlanPromptParams): string => {
  const prompt = customPrompt || defaultGeneratePlanPrompt;

  return replaceVariable(prompt, {
    task,
    context: context || '无额外上下文信息'
  });
};

export const modifyPlanPrompt = ({
  currentPlan,
  modification,
  customPrompt
}: ModifyPlanPromptParams): string => {
  const prompt = customPrompt || defaultModifyPlanPrompt;

  return replaceVariable(prompt, {
    currentPlan,
    modification
  });
};
