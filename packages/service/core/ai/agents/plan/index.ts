import type { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type.d';
import { addLog } from '../../../../common/system/log';
import { createLLMResponse } from '../../llm/request';
import { defaultGeneratePlanPrompt } from './prompt';
import { ChatCompletionRequestMessageRoleEnum } from '@fastgpt/global/core/ai/constants';
import type { WorkflowResponseType } from 'core/workflow/dispatch/type';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';

type PlanAgentToolArgs = {
  instruction: string;
};

type transferPlanAgentProps = {
  model: string;
  toolId: string;
  toolArgs: PlanAgentToolArgs;
  sharedContext: ChatCompletionMessageParam[];
  customSystemPrompt?: string;
  workflowStreamResponse?: WorkflowResponseType;
};

export async function transferPlanAgent({
  model,
  toolId,
  toolArgs,
  sharedContext,
  customSystemPrompt,
  workflowStreamResponse
}: transferPlanAgentProps): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const { instruction } = toolArgs;

  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: customSystemPrompt || defaultGeneratePlanPrompt
      },
      ...sharedContext.filter((item) => item.role !== 'system'),
      {
        role: 'user',
        content: instruction
      }
    ];

    const {
      answerText,
      usage: { inputTokens, outputTokens }
    } = await createLLMResponse({
      body: {
        model,
        temperature: 0,
        messages,
        stream: true
      },
      onStreaming({ fullText }) {
        workflowStreamResponse?.({
          event: SseResponseEventEnum.toolResponse,
          data: {
            tool: {
              id: toolId,
              toolName: '',
              toolAvatar: '',
              params: '',
              response: fullText
            }
          }
        });
      }
    });

    return {
      content: answerText,
      inputTokens,
      outputTokens
    };
  } catch (error) {
    addLog.warn('call plan_agent failed');
    return {
      content: '',
      inputTokens: 0,
      outputTokens: 0
    };
  }
}
