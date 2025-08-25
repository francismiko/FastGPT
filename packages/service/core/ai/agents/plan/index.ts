import type { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type.d';
import { addLog } from '../../../../common/system/log';
import { createLLMResponse } from '../../llm/request';
import { generatePlanPrompt, modifyPlanPrompt } from './prompt';
import { parsePlanResponse, formatPlanContent } from './utils';

export interface PlanStep {
  title: string;
  description?: string;
  todos: string[];
}

export interface TaskPlan {
  title: string;
  description?: string;
  steps: PlanStep[];
}

export interface GeneratePlanParams {
  task: string;
  context?: string;
  model: string;
  customPrompt?: string;
}

export interface ModifyPlanParams {
  currentPlan: string;
  modification: string;
  model: string;
  customPrompt?: string;
}

export async function generateTaskPlan({
  task,
  context,
  model,
  customPrompt
}: GeneratePlanParams): Promise<{
  plan: TaskPlan;
  markdown: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: generatePlanPrompt({
        task,
        context,
        customPrompt
      })
    }
  ];

  const {
    answerText: answer,
    usage: { inputTokens, outputTokens }
  } = await createLLMResponse({
    body: {
      model,
      temperature: 0.1,
      max_tokens: 2000,
      messages,
      stream: true
    }
  });

  if (!answer) {
    return {
      plan: { title: task, steps: [] },
      markdown: '',
      inputTokens,
      outputTokens
    };
  }

  try {
    const plan = parsePlanResponse(answer);
    const markdown = formatPlanContent(plan);

    return {
      plan,
      markdown,
      inputTokens,
      outputTokens
    };
  } catch (error) {
    addLog.warn('Generate task plan failed', {
      answer,
      error
    });
    return {
      plan: { title: task, steps: [] },
      markdown: answer,
      inputTokens,
      outputTokens
    };
  }
}

export async function modifyTaskPlan({
  currentPlan,
  modification,
  model,
  customPrompt
}: ModifyPlanParams): Promise<{
  plan: TaskPlan;
  markdown: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: modifyPlanPrompt({
        currentPlan,
        modification,
        customPrompt
      })
    }
  ];

  const {
    answerText: answer,
    usage: { inputTokens, outputTokens }
  } = await createLLMResponse({
    body: {
      model,
      temperature: 0.1,
      max_tokens: 2000,
      messages,
      stream: true
    }
  });

  if (!answer) {
    return {
      plan: { title: '', steps: [] },
      markdown: currentPlan,
      inputTokens,
      outputTokens
    };
  }

  try {
    const plan = parsePlanResponse(answer);
    const markdown = formatPlanContent(plan);

    return {
      plan,
      markdown,
      inputTokens,
      outputTokens
    };
  } catch (error) {
    addLog.warn('Modify task plan failed', {
      answer,
      error
    });
    return {
      plan: { title: '', steps: [] },
      markdown: answer,
      inputTokens,
      outputTokens
    };
  }
}
