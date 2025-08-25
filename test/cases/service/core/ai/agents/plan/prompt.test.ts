import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  generatePlanPrompt,
  modifyPlanPrompt,
  type GeneratePlanPromptParams,
  type ModifyPlanPromptParams
} from '@fastgpt/service/core/ai/agents/plan/prompt';

// Mock external dependencies
vi.mock('@fastgpt/global/common/string/tools', () => ({
  replaceVariable: vi.fn()
}));

import { replaceVariable } from '@fastgpt/global/common/string/tools';

const mockReplaceVariable = vi.mocked(replaceVariable);

describe('Plan Agent Prompt Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global.feConfigs
    global.feConfigs = {
      systemTitle: 'FastAI'
    } as any;
  });

  describe('generatePlanPrompt', () => {
    const baseParams: GeneratePlanPromptParams = {
      task: 'Build a web application',
      context: 'Using React and TypeScript',
      customPrompt: undefined
    };

    describe('Default prompt behavior', () => {
      it('should generate prompt with task and context using default template', () => {
        const expectedPromptContent = 'Processed default prompt with variables replaced';
        mockReplaceVariable.mockReturnValue(expectedPromptContent);

        const result = generatePlanPrompt(baseParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'), // Part of default prompt
          {
            task: 'Build a web application',
            context: 'Using React and TypeScript'
          }
        );

        expect(result).toBe(expectedPromptContent);
      });

      it('should use default context message when context is undefined', () => {
        const paramsWithoutContext: GeneratePlanPromptParams = {
          task: 'Simple task',
          context: undefined
        };

        const expectedPromptContent = 'Default prompt with no context';
        mockReplaceVariable.mockReturnValue(expectedPromptContent);

        const result = generatePlanPrompt(paramsWithoutContext);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Simple task',
            context: '无额外上下文信息'
          }
        );

        expect(result).toBe(expectedPromptContent);
      });

      it('should use default context message when context is empty string', () => {
        const paramsWithEmptyContext: GeneratePlanPromptParams = {
          task: 'Task with empty context',
          context: ''
        };

        const expectedPromptContent = 'Default prompt with empty context';
        mockReplaceVariable.mockReturnValue(expectedPromptContent);

        const result = generatePlanPrompt(paramsWithEmptyContext);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Task with empty context',
            context: '无额外上下文信息'
          }
        );

        expect(result).toBe(expectedPromptContent);
      });

      it('should preserve whitespace-only context as is', () => {
        const paramsWithWhitespaceContext: GeneratePlanPromptParams = {
          task: 'Task with whitespace context',
          context: '   \t\n  '
        };

        const expectedPromptContent = 'Prompt with whitespace context preserved';
        mockReplaceVariable.mockReturnValue(expectedPromptContent);

        const result = generatePlanPrompt(paramsWithWhitespaceContext);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Task with whitespace context',
            context: '   \t\n  '
          }
        );

        expect(result).toBe(expectedPromptContent);
      });
    });

    describe('Custom prompt behavior', () => {
      it('should use custom prompt when provided', () => {
        const customPrompt = 'Custom prompt template with {{task}} and {{context}} variables';
        const paramsWithCustomPrompt: GeneratePlanPromptParams = {
          task: 'Custom task',
          context: 'Custom context',
          customPrompt
        };

        const expectedCustomContent = 'Processed custom prompt';
        mockReplaceVariable.mockReturnValue(expectedCustomContent);

        const result = generatePlanPrompt(paramsWithCustomPrompt);

        expect(mockReplaceVariable).toHaveBeenCalledWith(customPrompt, {
          task: 'Custom task',
          context: 'Custom context'
        });

        expect(result).toBe(expectedCustomContent);
      });

      it('should handle custom prompt with no variable placeholders', () => {
        const staticCustomPrompt = 'This is a static prompt with no variables';
        const paramsWithStaticPrompt: GeneratePlanPromptParams = {
          task: 'Any task',
          context: 'Any context',
          customPrompt: staticCustomPrompt
        };

        const expectedStaticContent = 'Static prompt processed';
        mockReplaceVariable.mockReturnValue(expectedStaticContent);

        const result = generatePlanPrompt(paramsWithStaticPrompt);

        expect(mockReplaceVariable).toHaveBeenCalledWith(staticCustomPrompt, {
          task: 'Any task',
          context: 'Any context'
        });

        expect(result).toBe(expectedStaticContent);
      });

      it('should handle custom prompt with only task variable', () => {
        const taskOnlyPrompt = 'Please create a plan for: {{task}}';
        const params: GeneratePlanPromptParams = {
          task: 'Specific task',
          customPrompt: taskOnlyPrompt
        };

        const expectedContent = 'Please create a plan for: Specific task';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith(taskOnlyPrompt, {
          task: 'Specific task',
          context: '无额外上下文信息'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle custom prompt with only context variable', () => {
        const contextOnlyPrompt = 'Given this context: {{context}}, create a plan';
        const params: GeneratePlanPromptParams = {
          task: 'Task name',
          context: 'Important context',
          customPrompt: contextOnlyPrompt
        };

        const expectedContent = 'Given this context: Important context, create a plan';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith(contextOnlyPrompt, {
          task: 'Task name',
          context: 'Important context'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle empty custom prompt', () => {
        const params: GeneratePlanPromptParams = {
          task: 'Task with empty custom prompt',
          context: 'Some context',
          customPrompt: ''
        };

        const expectedContent = 'Empty custom prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith('', {
          task: 'Task with empty custom prompt',
          context: 'Some context'
        });

        expect(result).toBe(expectedContent);
      });
    });

    describe('Edge cases and special characters', () => {
      it('should handle special characters in task and context', () => {
        const specialParams: GeneratePlanPromptParams = {
          task: 'Task with special chars: @#$%^&*(){}[]|\\:";\'<>?,./`~',
          context: 'Context with unicode: 中文 العربية 🚀 🎉 émojis'
        };

        const expectedContent = 'Prompt with special characters processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(specialParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Task with special chars: @#$%^&*(){}[]|\\:";\'<>?,./`~',
            context: 'Context with unicode: 中文 العربية 🚀 🎉 émojis'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle very long task descriptions', () => {
        const longTask = 'A'.repeat(10000);
        const longParams: GeneratePlanPromptParams = {
          task: longTask,
          context: 'Normal context'
        };

        const expectedContent = 'Long task prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(longParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: longTask,
            context: 'Normal context'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle multiline task and context', () => {
        const multilineParams: GeneratePlanPromptParams = {
          task: 'Task line 1\nTask line 2\nTask line 3',
          context: 'Context line 1\n\nContext line 2\n\n\nContext line 3'
        };

        const expectedContent = 'Multiline prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(multilineParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Task line 1\nTask line 2\nTask line 3',
            context: 'Context line 1\n\nContext line 2\n\n\nContext line 3'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle task and context with template-like strings', () => {
        const templateLikeParams: GeneratePlanPromptParams = {
          task: 'Create {{component}} with {{props}}',
          context: 'Use framework {{framework}} version {{version}}'
        };

        const expectedContent = 'Template-like strings processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(templateLikeParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你是一个专业的任务规划助手'),
          {
            task: 'Create {{component}} with {{props}}',
            context: 'Use framework {{framework}} version {{version}}'
          }
        );

        expect(result).toBe(expectedContent);
      });
    });

    describe('Global configuration handling', () => {
      it('should handle missing global.feConfigs', () => {
        global.feConfigs = undefined as any;

        const params: GeneratePlanPromptParams = {
          task: 'Test task'
        };

        const expectedContent = 'Prompt without system title';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(result).toBe(expectedContent);
        expect(mockReplaceVariable).toHaveBeenCalled();
      });

      it('should handle missing systemTitle in global.feConfigs', () => {
        global.feConfigs = {} as any;

        const params: GeneratePlanPromptParams = {
          task: 'Test task'
        };

        const expectedContent = 'Prompt with undefined system title';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(result).toBe(expectedContent);
        expect(mockReplaceVariable).toHaveBeenCalled();
      });

      it('should handle custom systemTitle in global.feConfigs', () => {
        global.feConfigs = {
          systemTitle: 'CustomAI System'
        } as any;

        const params: GeneratePlanPromptParams = {
          task: 'Test task with custom system'
        };

        const expectedContent = 'Prompt with custom system title';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = generatePlanPrompt(params);

        expect(result).toBe(expectedContent);
        expect(mockReplaceVariable).toHaveBeenCalled();
      });
    });
  });

  describe('modifyPlanPrompt', () => {
    const baseParams: ModifyPlanPromptParams = {
      currentPlan: '# Current Plan\n\n## Step 1: Initial step\n\n### Todo List\n- [ ] First todo',
      modification: 'Add a testing step',
      customPrompt: undefined
    };

    describe('Default prompt behavior', () => {
      it('should generate modification prompt with current plan and modification using default template', () => {
        const expectedPromptContent = 'Processed default modification prompt';
        mockReplaceVariable.mockReturnValue(expectedPromptContent);

        const result = modifyPlanPrompt(baseParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'), // Part of default modify prompt
          {
            currentPlan:
              '# Current Plan\n\n## Step 1: Initial step\n\n### Todo List\n- [ ] First todo',
            modification: 'Add a testing step'
          }
        );

        expect(result).toBe(expectedPromptContent);
      });

      it('should handle empty current plan', () => {
        const emptyPlanParams: ModifyPlanPromptParams = {
          currentPlan: '',
          modification: 'Create plan from scratch'
        };

        const expectedContent = 'Empty plan modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(emptyPlanParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: '',
            modification: 'Create plan from scratch'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle complex current plan with multiple steps', () => {
        const complexPlan = `# Complex Project Plan

Project description here.

## Step 1: Setup
Setup description
### Todo List
- [ ] Install dependencies
- [ ] Configure environment

## Step 2: Development
Development description
### Todo List
- [ ] Implement features
- [ ] Write tests

## Step 3: Deployment
### Todo List
- [ ] Build application
- [ ] Deploy to production`;

        const complexParams: ModifyPlanPromptParams = {
          currentPlan: complexPlan,
          modification: 'Add security review step before deployment'
        };

        const expectedContent = 'Complex plan modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(complexParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: complexPlan,
            modification: 'Add security review step before deployment'
          }
        );

        expect(result).toBe(expectedContent);
      });
    });

    describe('Custom prompt behavior', () => {
      it('should use custom prompt when provided', () => {
        const customPrompt =
          'Custom modification template: Current: {{currentPlan}}, Change: {{modification}}';
        const customParams: ModifyPlanPromptParams = {
          currentPlan: 'Original plan content',
          modification: 'Specific modification request',
          customPrompt
        };

        const expectedContent = 'Custom modification prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(customParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(customPrompt, {
          currentPlan: 'Original plan content',
          modification: 'Specific modification request'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle custom prompt with no variable placeholders', () => {
        const staticPrompt = 'Please modify the plan as requested';
        const staticParams: ModifyPlanPromptParams = {
          currentPlan: 'Some plan',
          modification: 'Some change',
          customPrompt: staticPrompt
        };

        const expectedContent = 'Static modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(staticParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(staticPrompt, {
          currentPlan: 'Some plan',
          modification: 'Some change'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle custom prompt with only currentPlan variable', () => {
        const planOnlyPrompt = 'Here is the current plan: {{currentPlan}}. Please improve it.';
        const params: ModifyPlanPromptParams = {
          currentPlan: 'Detailed plan content',
          modification: 'General improvements',
          customPrompt: planOnlyPrompt
        };

        const expectedContent = 'Plan-only prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith(planOnlyPrompt, {
          currentPlan: 'Detailed plan content',
          modification: 'General improvements'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle custom prompt with only modification variable', () => {
        const modificationOnlyPrompt = 'Apply this change: {{modification}}';
        const params: ModifyPlanPromptParams = {
          currentPlan: 'Existing plan',
          modification: 'Specific change request',
          customPrompt: modificationOnlyPrompt
        };

        const expectedContent = 'Modification-only prompt processed';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith(modificationOnlyPrompt, {
          currentPlan: 'Existing plan',
          modification: 'Specific change request'
        });

        expect(result).toBe(expectedContent);
      });

      it('should handle empty custom prompt', () => {
        const params: ModifyPlanPromptParams = {
          currentPlan: 'Plan content',
          modification: 'Change request',
          customPrompt: ''
        };

        const expectedContent = 'Empty custom modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(params);

        expect(mockReplaceVariable).toHaveBeenCalledWith('', {
          currentPlan: 'Plan content',
          modification: 'Change request'
        });

        expect(result).toBe(expectedContent);
      });
    });

    describe('Edge cases and special characters', () => {
      it('should handle special characters in current plan and modification', () => {
        const specialParams: ModifyPlanPromptParams = {
          currentPlan: '# Plan with Special Chars\n\n- [ ] Task @#$%^&*()\n- [ ] Unicode: 中文 🚀',
          modification: 'Add émojis and spëcial chars: @#$%^&*(){}[]|\\:";\'<>?,./`~'
        };

        const expectedContent = 'Special characters modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(specialParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan:
              '# Plan with Special Chars\n\n- [ ] Task @#$%^&*()\n- [ ] Unicode: 中文 🚀',
            modification: 'Add émojis and spëcial chars: @#$%^&*(){}[]|\\:";\'<>?,./`~'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle very large current plan', () => {
        const largePlan = '# Large Plan\n\n' + 'Content line with various details\n'.repeat(1000);
        const largeParams: ModifyPlanPromptParams = {
          currentPlan: largePlan,
          modification: 'Minor adjustment'
        };

        const expectedContent = 'Large plan modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(largeParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: largePlan,
            modification: 'Minor adjustment'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle multiline modification instructions', () => {
        const multilineParams: ModifyPlanPromptParams = {
          currentPlan: '# Simple Plan\n\n## Step 1\n- [ ] Todo',
          modification: `Multiple changes needed:
1. Add error handling
2. Include testing phase
3. Update deployment process

Each step should be detailed.`
        };

        const expectedContent = 'Multiline modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(multilineParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: '# Simple Plan\n\n## Step 1\n- [ ] Todo',
            modification: multilineParams.modification
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle template-like strings in plan and modification', () => {
        const templateParams: ModifyPlanPromptParams = {
          currentPlan: '# Plan for {{project}}\n\n## Step {{stepNumber}}: {{stepName}}',
          modification:
            'Replace {{placeholders}} with actual values: {{project}} = "WebApp", {{stepNumber}} = 1'
        };

        const expectedContent = 'Template-like modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(templateParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: '# Plan for {{project}}\n\n## Step {{stepNumber}}: {{stepName}}',
            modification:
              'Replace {{placeholders}} with actual values: {{project}} = "WebApp", {{stepNumber}} = 1'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle markdown with code blocks in current plan', () => {
        const planWithCode = `# Development Plan

## Step 1: Setup
\`\`\`bash
npm install
npm start
\`\`\`

## Step 2: Code
\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

### Todo List
- [ ] Run setup commands
- [ ] Implement functions`;

        const codeParams: ModifyPlanPromptParams = {
          currentPlan: planWithCode,
          modification: 'Add TypeScript configuration and update code examples'
        };

        const expectedContent = 'Code blocks modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(codeParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: planWithCode,
            modification: 'Add TypeScript configuration and update code examples'
          }
        );

        expect(result).toBe(expectedContent);
      });
    });

    describe('Complex modification scenarios', () => {
      it('should handle modification request to remove steps', () => {
        const removeParams: ModifyPlanPromptParams = {
          currentPlan: '# Plan\n\n## Step 1: A\n## Step 2: B\n## Step 3: C',
          modification: 'Remove step 2 and merge its todos into step 1'
        };

        const expectedContent = 'Remove steps modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(removeParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: '# Plan\n\n## Step 1: A\n## Step 2: B\n## Step 3: C',
            modification: 'Remove step 2 and merge its todos into step 1'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle modification request to reorder steps', () => {
        const reorderParams: ModifyPlanPromptParams = {
          currentPlan:
            '# Project\n\n## Step 1: Development\n## Step 2: Testing\n## Step 3: Deployment',
          modification: 'Change order to: Testing, Development, then Deployment'
        };

        const expectedContent = 'Reorder steps modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(reorderParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan:
              '# Project\n\n## Step 1: Development\n## Step 2: Testing\n## Step 3: Deployment',
            modification: 'Change order to: Testing, Development, then Deployment'
          }
        );

        expect(result).toBe(expectedContent);
      });

      it('should handle modification with detailed step insertions', () => {
        const insertParams: ModifyPlanPromptParams = {
          currentPlan: '# Basic Plan\n\n## Step 1: Start\n## Step 2: End',
          modification: `Insert new steps between Start and End:
- Code Review (with peer review checklist)
- Security Audit (including vulnerability scanning)
- Performance Testing (load testing and optimization)
Each should have detailed todo items.`
        };

        const expectedContent = 'Detailed insertion modification prompt';
        mockReplaceVariable.mockReturnValue(expectedContent);

        const result = modifyPlanPrompt(insertParams);

        expect(mockReplaceVariable).toHaveBeenCalledWith(
          expect.stringContaining('你需要根据用户的修改要求，调整现有的任务计划'),
          {
            currentPlan: '# Basic Plan\n\n## Step 1: Start\n## Step 2: End',
            modification: insertParams.modification
          }
        );

        expect(result).toBe(expectedContent);
      });
    });
  });

  describe('Integration between generatePlanPrompt and modifyPlanPrompt', () => {
    it('should handle workflow where generate prompt output feeds into modify prompt', () => {
      // Simulate generating a plan first
      const generateParams: GeneratePlanPromptParams = {
        task: 'Build mobile app',
        context: 'React Native with TypeScript'
      };

      const generatedPrompt = 'Generated plan prompt content';
      mockReplaceVariable.mockReturnValueOnce(generatedPrompt);

      const generateResult = generatePlanPrompt(generateParams);

      // Simulate the resulting plan being used in modification
      const modifyParams: ModifyPlanPromptParams = {
        currentPlan:
          '# Mobile App Plan\n\n## Step 1: Setup React Native\n### Todo List\n- [ ] Install dependencies',
        modification: 'Add iOS and Android specific configurations'
      };

      const modifiedPrompt = 'Modified plan prompt content';
      mockReplaceVariable.mockReturnValueOnce(modifiedPrompt);

      const modifyResult = modifyPlanPrompt(modifyParams);

      expect(generateResult).toBe(generatedPrompt);
      expect(modifyResult).toBe(modifiedPrompt);
      expect(mockReplaceVariable).toHaveBeenCalledTimes(2);
    });

    it('should handle both functions with same custom prompts pattern', () => {
      const customGeneratePrompt = 'Custom generate: {{task}} with {{context}}';
      const customModifyPrompt = 'Custom modify: {{currentPlan}} change to {{modification}}';

      const generateParams: GeneratePlanPromptParams = {
        task: 'Consistent task',
        context: 'Consistent context',
        customPrompt: customGeneratePrompt
      };

      const modifyParams: ModifyPlanPromptParams = {
        currentPlan: 'Consistent plan',
        modification: 'Consistent modification',
        customPrompt: customModifyPrompt
      };

      mockReplaceVariable
        .mockReturnValueOnce('Custom generated result')
        .mockReturnValueOnce('Custom modified result');

      const generateResult = generatePlanPrompt(generateParams);
      const modifyResult = modifyPlanPrompt(modifyParams);

      expect(generateResult).toBe('Custom generated result');
      expect(modifyResult).toBe('Custom modified result');

      expect(mockReplaceVariable).toHaveBeenNthCalledWith(1, customGeneratePrompt, {
        task: 'Consistent task',
        context: 'Consistent context'
      });

      expect(mockReplaceVariable).toHaveBeenNthCalledWith(2, customModifyPrompt, {
        currentPlan: 'Consistent plan',
        modification: 'Consistent modification'
      });
    });
  });

  describe('Error handling and robustness', () => {
    it('should handle replaceVariable function throwing an error', () => {
      const params: GeneratePlanPromptParams = {
        task: 'Error test task'
      };

      mockReplaceVariable.mockImplementation(() => {
        throw new Error('Variable replacement failed');
      });

      expect(() => generatePlanPrompt(params)).toThrow('Variable replacement failed');
    });

    it('should handle replaceVariable returning unexpected types', () => {
      const params: GeneratePlanPromptParams = {
        task: 'Type test task'
      };

      // Test different return types
      mockReplaceVariable.mockReturnValueOnce(null as any);
      expect(generatePlanPrompt(params)).toBe(null);

      mockReplaceVariable.mockReturnValueOnce(undefined as any);
      expect(generatePlanPrompt(params)).toBe(undefined);

      mockReplaceVariable.mockReturnValueOnce(123 as any);
      expect(generatePlanPrompt(params)).toBe(123);
    });
  });
});
