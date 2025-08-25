import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  generateTaskPlan,
  modifyTaskPlan,
  type GeneratePlanParams,
  type ModifyPlanParams,
  type TaskPlan,
  type PlanStep
} from '@fastgpt/service/core/ai/agents/plan/index';

// Mock external dependencies
vi.mock('@fastgpt/service/common/system/log', () => ({
  addLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@fastgpt/service/core/ai/llm/request', () => ({
  createLLMResponse: vi.fn()
}));

vi.mock('@fastgpt/service/core/ai/agents/plan/prompt', () => ({
  generatePlanPrompt: vi.fn(),
  modifyPlanPrompt: vi.fn()
}));

vi.mock('@fastgpt/service/core/ai/agents/plan/utils', () => ({
  parsePlanResponse: vi.fn(),
  formatPlanContent: vi.fn()
}));

import { addLog } from '@fastgpt/service/common/system/log';
import { createLLMResponse } from '@fastgpt/service/core/ai/llm/request';
import { generatePlanPrompt, modifyPlanPrompt } from '@fastgpt/service/core/ai/agents/plan/prompt';
import { parsePlanResponse, formatPlanContent } from '@fastgpt/service/core/ai/agents/plan/utils';

const mockAddLog = vi.mocked(addLog);
const mockCreateLLMResponse = vi.mocked(createLLMResponse);
const mockGeneratePlanPrompt = vi.mocked(generatePlanPrompt);
const mockModifyPlanPrompt = vi.mocked(modifyPlanPrompt);
const mockParsePlanResponse = vi.mocked(parsePlanResponse);
const mockFormatPlanContent = vi.mocked(formatPlanContent);

describe('Plan Agent Index Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTaskPlan', () => {
    const defaultParams: GeneratePlanParams = {
      task: 'Build a web application',
      context: 'Using React and Node.js',
      model: 'gpt-4',
      customPrompt: undefined
    };

    const mockTaskPlan: TaskPlan = {
      title: 'Build a web application',
      description: 'A comprehensive plan to build a web application',
      steps: [
        {
          title: 'Setup development environment',
          description: 'Install necessary tools and dependencies',
          todos: ['Install Node.js', 'Setup React project', 'Configure development tools']
        },
        {
          title: 'Implement backend API',
          todos: ['Create Express server', 'Setup database connection', 'Implement REST endpoints']
        }
      ]
    };

    const mockLLMResponse = {
      answerText:
        '# Build a web application\n\n## Step 1: Setup\n\n### Todo List\n- [ ] Install Node.js',
      usage: { inputTokens: 100, outputTokens: 200 }
    };

    describe('Successful plan generation', () => {
      it('should generate a valid task plan with all required parameters', async () => {
        mockGeneratePlanPrompt.mockReturnValue('Generated prompt for task planning');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('# Formatted markdown content');

        const result = await generateTaskPlan(defaultParams);

        expect(mockGeneratePlanPrompt).toHaveBeenCalledWith({
          task: defaultParams.task,
          context: defaultParams.context,
          customPrompt: defaultParams.customPrompt
        });

        expect(mockCreateLLMResponse).toHaveBeenCalledWith({
          body: {
            model: defaultParams.model,
            temperature: 0.1,
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: 'Generated prompt for task planning'
              }
            ],
            stream: true
          }
        });

        expect(mockParsePlanResponse).toHaveBeenCalledWith(mockLLMResponse.answerText);
        expect(mockFormatPlanContent).toHaveBeenCalledWith(mockTaskPlan);

        expect(result).toEqual({
          plan: mockTaskPlan,
          markdown: '# Formatted markdown content',
          inputTokens: 100,
          outputTokens: 200
        });
      });

      it('should handle minimal parameters without context', async () => {
        const minimalParams: GeneratePlanParams = {
          task: 'Simple task',
          model: 'gpt-3.5-turbo'
        };

        mockGeneratePlanPrompt.mockReturnValue('Minimal prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('Formatted content');

        const result = await generateTaskPlan(minimalParams);

        expect(mockGeneratePlanPrompt).toHaveBeenCalledWith({
          task: 'Simple task',
          context: undefined,
          customPrompt: undefined
        });

        expect(result.plan).toEqual(mockTaskPlan);
        expect(result.inputTokens).toBe(100);
        expect(result.outputTokens).toBe(200);
      });

      it('should use custom prompt when provided', async () => {
        const paramsWithCustomPrompt: GeneratePlanParams = {
          ...defaultParams,
          customPrompt: 'Custom planning prompt template'
        };

        mockGeneratePlanPrompt.mockReturnValue('Custom generated prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('Custom formatted content');

        await generateTaskPlan(paramsWithCustomPrompt);

        expect(mockGeneratePlanPrompt).toHaveBeenCalledWith({
          task: defaultParams.task,
          context: defaultParams.context,
          customPrompt: 'Custom planning prompt template'
        });
      });
    });

    describe('Empty LLM response handling', () => {
      it('should return empty plan when LLM response is empty', async () => {
        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: '',
          usage: { inputTokens: 50, outputTokens: 0 }
        });

        const result = await generateTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: defaultParams.task, steps: [] },
          markdown: '',
          inputTokens: 50,
          outputTokens: 0
        });

        expect(mockParsePlanResponse).not.toHaveBeenCalled();
        expect(mockFormatPlanContent).not.toHaveBeenCalled();
      });

      it('should return empty plan when LLM response is null', async () => {
        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: null as any,
          usage: { inputTokens: 30, outputTokens: 0 }
        });

        const result = await generateTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: defaultParams.task, steps: [] },
          markdown: '',
          inputTokens: 30,
          outputTokens: 0
        });
      });

      it('should return empty plan when LLM response is undefined', async () => {
        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: undefined as any,
          usage: { inputTokens: 25, outputTokens: 0 }
        });

        const result = await generateTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: defaultParams.task, steps: [] },
          markdown: '',
          inputTokens: 25,
          outputTokens: 0
        });
      });
    });

    describe('Parsing error handling', () => {
      it('should handle parsing errors gracefully and log warning', async () => {
        const errorAnswer = 'Invalid markdown format that cannot be parsed';
        const parseError = new Error('Failed to parse plan response');

        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: errorAnswer,
          usage: { inputTokens: 80, outputTokens: 150 }
        });
        mockParsePlanResponse.mockImplementation(() => {
          throw parseError;
        });

        const result = await generateTaskPlan(defaultParams);

        expect(mockAddLog.warn).toHaveBeenCalledWith('Generate task plan failed', {
          answer: errorAnswer,
          error: parseError
        });

        expect(result).toEqual({
          plan: { title: defaultParams.task, steps: [] },
          markdown: errorAnswer,
          inputTokens: 80,
          outputTokens: 150
        });

        expect(mockFormatPlanContent).not.toHaveBeenCalled();
      });

      it('should handle different types of parsing errors', async () => {
        const errorScenarios = [
          { error: new SyntaxError('Invalid syntax'), description: 'SyntaxError' },
          { error: new TypeError('Type error'), description: 'TypeError' },
          { error: 'String error', description: 'String error' },
          { error: { message: 'Object error' }, description: 'Object error' }
        ];

        for (const scenario of errorScenarios) {
          vi.clearAllMocks();

          mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
          mockCreateLLMResponse.mockResolvedValue({
            answerText: 'Invalid response',
            usage: { inputTokens: 100, outputTokens: 100 }
          });
          mockParsePlanResponse.mockImplementation(() => {
            throw scenario.error;
          });

          const result = await generateTaskPlan(defaultParams);

          expect(mockAddLog.warn).toHaveBeenCalledWith('Generate task plan failed', {
            answer: 'Invalid response',
            error: scenario.error
          });

          expect(result.plan).toEqual({ title: defaultParams.task, steps: [] });
          expect(result.markdown).toBe('Invalid response');
        }
      });
    });

    describe('LLM API error handling', () => {
      it('should propagate LLM API errors', async () => {
        const llmError = new Error('LLM API connection failed');

        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockRejectedValue(llmError);

        await expect(generateTaskPlan(defaultParams)).rejects.toThrow('LLM API connection failed');

        expect(mockParsePlanResponse).not.toHaveBeenCalled();
        expect(mockFormatPlanContent).not.toHaveBeenCalled();
        expect(mockAddLog.warn).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle very long task descriptions', async () => {
        const longTask = 'A'.repeat(10000);
        const longParams: GeneratePlanParams = {
          ...defaultParams,
          task: longTask
        };

        mockGeneratePlanPrompt.mockReturnValue('Long prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('Formatted content');

        const result = await generateTaskPlan(longParams);

        expect(result.plan).toEqual(mockTaskPlan);
        expect(mockGeneratePlanPrompt).toHaveBeenCalledWith({
          task: longTask,
          context: defaultParams.context,
          customPrompt: undefined
        });
      });

      it('should handle special characters in task and context', async () => {
        const specialParams: GeneratePlanParams = {
          task: 'Task with special chars: @#$%^&*(){}[]|\\:";\'<>?,./`~',
          context: 'Context with unicode: 中文 العربية 🚀 🎉',
          model: 'gpt-4'
        };

        mockGeneratePlanPrompt.mockReturnValue('Special chars prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('Special formatted content');

        const result = await generateTaskPlan(specialParams);

        expect(result.plan).toEqual(mockTaskPlan);
        expect(mockGeneratePlanPrompt).toHaveBeenCalledWith({
          task: specialParams.task,
          context: specialParams.context,
          customPrompt: undefined
        });
      });

      it('should handle zero token usage', async () => {
        mockGeneratePlanPrompt.mockReturnValue('Generated prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: 'Valid response',
          usage: { inputTokens: 0, outputTokens: 0 }
        });
        mockParsePlanResponse.mockReturnValue(mockTaskPlan);
        mockFormatPlanContent.mockReturnValue('Formatted content');

        const result = await generateTaskPlan(defaultParams);

        expect(result.inputTokens).toBe(0);
        expect(result.outputTokens).toBe(0);
        expect(result.plan).toEqual(mockTaskPlan);
      });
    });
  });

  describe('modifyTaskPlan', () => {
    const defaultParams: ModifyPlanParams = {
      currentPlan: '# Current Plan\n\n## Step 1: Initial step\n\n### Todo List\n- [ ] First todo',
      modification: 'Add a new step for testing',
      model: 'gpt-4',
      customPrompt: undefined
    };

    const mockModifiedPlan: TaskPlan = {
      title: 'Modified Plan',
      description: 'Updated plan with modifications',
      steps: [
        {
          title: 'Initial step',
          todos: ['First todo', 'Updated todo']
        },
        {
          title: 'Testing step',
          description: 'Added testing phase',
          todos: ['Write unit tests', 'Run integration tests']
        }
      ]
    };

    const mockLLMResponse = {
      answerText:
        '# Modified Plan\n\n## Step 1: Initial step\n\n### Todo List\n- [ ] Updated content',
      usage: { inputTokens: 120, outputTokens: 180 }
    };

    describe('Successful plan modification', () => {
      it('should modify task plan with all required parameters', async () => {
        mockModifyPlanPrompt.mockReturnValue('Generated modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('# Modified formatted content');

        const result = await modifyTaskPlan(defaultParams);

        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: defaultParams.currentPlan,
          modification: defaultParams.modification,
          customPrompt: defaultParams.customPrompt
        });

        expect(mockCreateLLMResponse).toHaveBeenCalledWith({
          body: {
            model: defaultParams.model,
            temperature: 0.1,
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: 'Generated modification prompt'
              }
            ],
            stream: true
          }
        });

        expect(mockParsePlanResponse).toHaveBeenCalledWith(mockLLMResponse.answerText);
        expect(mockFormatPlanContent).toHaveBeenCalledWith(mockModifiedPlan);

        expect(result).toEqual({
          plan: mockModifiedPlan,
          markdown: '# Modified formatted content',
          inputTokens: 120,
          outputTokens: 180
        });
      });

      it('should handle modification with custom prompt', async () => {
        const paramsWithCustomPrompt: ModifyPlanParams = {
          ...defaultParams,
          customPrompt: 'Custom modification prompt template'
        };

        mockModifyPlanPrompt.mockReturnValue('Custom modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('Custom modified content');

        await modifyTaskPlan(paramsWithCustomPrompt);

        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: defaultParams.currentPlan,
          modification: defaultParams.modification,
          customPrompt: 'Custom modification prompt template'
        });
      });

      it('should handle complex modification instructions', async () => {
        const complexParams: ModifyPlanParams = {
          currentPlan: defaultParams.currentPlan,
          modification:
            'Remove step 2, add new step for deployment, and update step 1 to include error handling',
          model: 'gpt-4-turbo'
        };

        mockModifyPlanPrompt.mockReturnValue('Complex modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('Complex modified content');

        const result = await modifyTaskPlan(complexParams);

        expect(result.plan).toEqual(mockModifiedPlan);
        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: complexParams.currentPlan,
          modification: complexParams.modification,
          customPrompt: undefined
        });
      });
    });

    describe('Empty LLM response handling', () => {
      it('should return current plan as markdown when LLM response is empty', async () => {
        mockModifyPlanPrompt.mockReturnValue('Modification prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: '',
          usage: { inputTokens: 60, outputTokens: 0 }
        });

        const result = await modifyTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: '', steps: [] },
          markdown: defaultParams.currentPlan,
          inputTokens: 60,
          outputTokens: 0
        });

        expect(mockParsePlanResponse).not.toHaveBeenCalled();
        expect(mockFormatPlanContent).not.toHaveBeenCalled();
      });

      it('should return current plan when LLM response is null', async () => {
        mockModifyPlanPrompt.mockReturnValue('Modification prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: null as any,
          usage: { inputTokens: 40, outputTokens: 0 }
        });

        const result = await modifyTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: '', steps: [] },
          markdown: defaultParams.currentPlan,
          inputTokens: 40,
          outputTokens: 0
        });
      });

      it('should return current plan when LLM response is undefined', async () => {
        mockModifyPlanPrompt.mockReturnValue('Modification prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: undefined as any,
          usage: { inputTokens: 35, outputTokens: 0 }
        });

        const result = await modifyTaskPlan(defaultParams);

        expect(result).toEqual({
          plan: { title: '', steps: [] },
          markdown: defaultParams.currentPlan,
          inputTokens: 35,
          outputTokens: 0
        });
      });
    });

    describe('Parsing error handling', () => {
      it('should handle parsing errors and return raw response', async () => {
        const errorAnswer = 'Invalid modified plan format';
        const parseError = new Error('Failed to parse modified plan');

        mockModifyPlanPrompt.mockReturnValue('Modification prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: errorAnswer,
          usage: { inputTokens: 90, outputTokens: 160 }
        });
        mockParsePlanResponse.mockImplementation(() => {
          throw parseError;
        });

        const result = await modifyTaskPlan(defaultParams);

        expect(mockAddLog.warn).toHaveBeenCalledWith('Modify task plan failed', {
          answer: errorAnswer,
          error: parseError
        });

        expect(result).toEqual({
          plan: { title: '', steps: [] },
          markdown: errorAnswer,
          inputTokens: 90,
          outputTokens: 160
        });

        expect(mockFormatPlanContent).not.toHaveBeenCalled();
      });

      it('should handle various error types during modification parsing', async () => {
        const errorTypes = [
          new RangeError('Range error in parsing'),
          new ReferenceError('Reference error'),
          { name: 'CustomError', message: 'Custom parsing error' }
        ];

        for (const error of errorTypes) {
          vi.clearAllMocks();

          mockModifyPlanPrompt.mockReturnValue('Modification prompt');
          mockCreateLLMResponse.mockResolvedValue({
            answerText: 'Error response',
            usage: { inputTokens: 100, outputTokens: 100 }
          });
          mockParsePlanResponse.mockImplementation(() => {
            throw error;
          });

          const result = await modifyTaskPlan(defaultParams);

          expect(mockAddLog.warn).toHaveBeenCalledWith('Modify task plan failed', {
            answer: 'Error response',
            error
          });

          expect(result.plan).toEqual({ title: '', steps: [] });
          expect(result.markdown).toBe('Error response');
        }
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle empty current plan', async () => {
        const emptyPlanParams: ModifyPlanParams = {
          currentPlan: '',
          modification: 'Create a new plan from scratch',
          model: 'gpt-4'
        };

        mockModifyPlanPrompt.mockReturnValue('Empty plan modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('New plan content');

        const result = await modifyTaskPlan(emptyPlanParams);

        expect(result.plan).toEqual(mockModifiedPlan);
        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: '',
          modification: 'Create a new plan from scratch',
          customPrompt: undefined
        });
      });

      it('should handle very large current plans', async () => {
        const largePlan = '# Large Plan\n\n' + 'Content line\n'.repeat(1000);
        const largePlanParams: ModifyPlanParams = {
          currentPlan: largePlan,
          modification: 'Minor adjustment',
          model: 'gpt-4'
        };

        mockModifyPlanPrompt.mockReturnValue('Large plan modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('Modified large plan');

        const result = await modifyTaskPlan(largePlanParams);

        expect(result.plan).toEqual(mockModifiedPlan);
        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: largePlan,
          modification: 'Minor adjustment',
          customPrompt: undefined
        });
      });

      it('should handle unicode and special characters in modification', async () => {
        const unicodeParams: ModifyPlanParams = {
          currentPlan: defaultParams.currentPlan,
          modification:
            'Add step for 国际化 (internationalization) with émojis 🌍 and spëcial chärs',
          model: 'gpt-4'
        };

        mockModifyPlanPrompt.mockReturnValue('Unicode modification prompt');
        mockCreateLLMResponse.mockResolvedValue(mockLLMResponse);
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('Unicode modified content');

        const result = await modifyTaskPlan(unicodeParams);

        expect(result.plan).toEqual(mockModifiedPlan);
        expect(mockModifyPlanPrompt).toHaveBeenCalledWith({
          currentPlan: defaultParams.currentPlan,
          modification: unicodeParams.modification,
          customPrompt: undefined
        });
      });

      it('should handle high token usage scenarios', async () => {
        mockModifyPlanPrompt.mockReturnValue('High token prompt');
        mockCreateLLMResponse.mockResolvedValue({
          answerText: 'Response with high token usage',
          usage: { inputTokens: 1500, outputTokens: 1800 }
        });
        mockParsePlanResponse.mockReturnValue(mockModifiedPlan);
        mockFormatPlanContent.mockReturnValue('High token content');

        const result = await modifyTaskPlan(defaultParams);

        expect(result.inputTokens).toBe(1500);
        expect(result.outputTokens).toBe(1800);
        expect(result.plan).toEqual(mockModifiedPlan);
      });
    });

    describe('LLM API error handling', () => {
      it('should propagate LLM API errors during modification', async () => {
        const apiError = new Error('Model not available');

        mockModifyPlanPrompt.mockReturnValue('Modification prompt');
        mockCreateLLMResponse.mockRejectedValue(apiError);

        await expect(modifyTaskPlan(defaultParams)).rejects.toThrow('Model not available');

        expect(mockParsePlanResponse).not.toHaveBeenCalled();
        expect(mockFormatPlanContent).not.toHaveBeenCalled();
        expect(mockAddLog.warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle both functions with consistent behavior', async () => {
      // First generate a plan
      const generateParams: GeneratePlanParams = {
        task: 'Integration test task',
        model: 'gpt-4'
      };

      const originalPlan: TaskPlan = {
        title: 'Integration test task',
        steps: [{ title: 'Step 1', todos: ['Todo 1'] }]
      };

      mockGeneratePlanPrompt.mockReturnValue('Generate prompt');
      mockCreateLLMResponse.mockResolvedValueOnce({
        answerText: 'Generated plan response',
        usage: { inputTokens: 100, outputTokens: 150 }
      });
      mockParsePlanResponse.mockReturnValueOnce(originalPlan);
      mockFormatPlanContent.mockReturnValueOnce('Original formatted plan');

      const generateResult = await generateTaskPlan(generateParams);

      // Then modify the plan
      const modifyParams: ModifyPlanParams = {
        currentPlan: generateResult.markdown,
        modification: 'Add more details',
        model: 'gpt-4'
      };

      const modifiedPlan: TaskPlan = {
        title: 'Integration test task',
        steps: [
          { title: 'Step 1', todos: ['Todo 1', 'Todo 2'] },
          { title: 'Step 2', todos: ['Todo 3'] }
        ]
      };

      mockModifyPlanPrompt.mockReturnValue('Modify prompt');
      mockCreateLLMResponse.mockResolvedValueOnce({
        answerText: 'Modified plan response',
        usage: { inputTokens: 120, outputTokens: 180 }
      });
      mockParsePlanResponse.mockReturnValueOnce(modifiedPlan);
      mockFormatPlanContent.mockReturnValueOnce('Modified formatted plan');

      const modifyResult = await modifyTaskPlan(modifyParams);

      expect(generateResult.plan).toEqual(originalPlan);
      expect(modifyResult.plan).toEqual(modifiedPlan);
      expect(modifyResult.plan.steps).toHaveLength(2);
      expect(generateResult.inputTokens + modifyResult.inputTokens).toBe(220);
      expect(generateResult.outputTokens + modifyResult.outputTokens).toBe(330);
    });
  });
});
