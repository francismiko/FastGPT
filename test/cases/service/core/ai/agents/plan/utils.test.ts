import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  parsePlanResponse,
  formatPlanContent,
  validatePlanStructure,
  extractStepFromMarkdown,
  updateStepInPlan,
  addStepToPlan,
  removeStepFromPlan,
  type TaskPlan,
  type PlanStep
} from '@fastgpt/service/core/ai/agents/plan/utils';

describe('Plan Agent Utils Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parsePlanResponse', () => {
    describe('Basic parsing functionality', () => {
      it('should parse a complete valid markdown plan', () => {
        const markdownInput = `# Build Web Application

A comprehensive web application development plan.

## Step 1: Setup Development Environment

Initialize the development workspace and install necessary tools.

### Todo List
- [ ] Install Node.js and npm
- [ ] Setup Git repository
- [ ] Configure development environment

## Step 2: Frontend Development

Create the user interface and user experience.

### Todo List
- [ ] Design wireframes
- [ ] Implement React components
- [ ] Style with CSS

## Step 3: Backend Development

### Todo List
- [ ] Setup Express server
- [ ] Create API endpoints
- [ ] Connect to database`;

        const result = parsePlanResponse(markdownInput);

        expect(result).toEqual({
          title: 'Build Web Application',
          description: 'A comprehensive web application development plan.',
          steps: [
            {
              title: 'Step 1: Setup Development Environment',
              description: 'Initialize the development workspace and install necessary tools.',
              todos: [
                'Install Node.js and npm',
                'Setup Git repository',
                'Configure development environment'
              ]
            },
            {
              title: 'Step 2: Frontend Development',
              description: 'Create the user interface and user experience.',
              todos: ['Design wireframes', 'Implement React components', 'Style with CSS']
            },
            {
              title: 'Step 3: Backend Development',
              todos: ['Setup Express server', 'Create API endpoints', 'Connect to database']
            }
          ]
        });
      });

      it('should parse plan without main description', () => {
        const markdownInput = `# Simple Plan

## Step 1: First Step

### Todo List
- [ ] First todo
- [ ] Second todo`;

        const result = parsePlanResponse(markdownInput);

        expect(result).toEqual({
          title: 'Simple Plan',
          description: '',
          steps: [
            {
              title: 'Step 1: First Step',
              todos: ['First todo', 'Second todo']
            }
          ]
        });
      });

      it('should parse plan without step descriptions', () => {
        const markdownInput = `# Plan Without Step Descriptions

## Step 1: Quick Step

### Todo List
- [ ] Todo one
- [ ] Todo two

## Step 2: Another Step

### Todo List
- [ ] Todo three`;

        const result = parsePlanResponse(markdownInput);

        expect(result).toEqual({
          title: 'Plan Without Step Descriptions',
          description: '',
          steps: [
            {
              title: 'Step 1: Quick Step',
              todos: ['Todo one', 'Todo two']
            },
            {
              title: 'Step 2: Another Step',
              todos: ['Todo three']
            }
          ]
        });
      });

      it('should handle completed todos (checked checkboxes)', () => {
        const markdownInput = `# Plan with Completed Todos

## Step 1: Mixed Todos

### Todo List
- [ ] Pending todo
- [x] Completed todo
- [ ] Another pending
- [x] Another completed`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps[0].todos).toEqual([
          'Pending todo',
          'Completed todo',
          'Another pending',
          'Another completed'
        ]);
      });

      it('should handle various todo list header formats', () => {
        const markdownInput = `# Various Todo Headers

## Step 1: Case Variations

### todo list
- [ ] Lower case header

## Step 2: Different Headers

### Todo Items
- [ ] Different header name

## Step 3: Mixed Case

### TODO LIST
- [ ] Upper case header`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0].todos).toEqual(['Lower case header']);
        expect(result.steps[1].todos).toEqual(['Different header name']);
        expect(result.steps[2].todos).toEqual(['Upper case header']);
      });
    });

    describe('Edge cases and malformed input', () => {
      it('should handle empty input', () => {
        const result = parsePlanResponse('');

        expect(result).toEqual({
          title: 'Untitled Plan',
          description: '',
          steps: []
        });
      });

      it('should handle input with only whitespace', () => {
        const result = parsePlanResponse('   \n\t\n   ');

        expect(result).toEqual({
          title: 'Untitled Plan',
          description: '',
          steps: []
        });
      });

      it('should handle plan without title', () => {
        const markdownInput = `## Step 1: No Title Plan

### Todo List
- [ ] Some todo`;

        const result = parsePlanResponse(markdownInput);

        expect(result).toEqual({
          title: 'Untitled Plan',
          description: '',
          steps: [
            {
              title: 'Step 1: No Title Plan',
              todos: ['Some todo']
            }
          ]
        });
      });

      it('should handle plan with title but no steps', () => {
        const markdownInput = `# Plan Without Steps

This plan has a title and description but no steps.`;

        const result = parsePlanResponse(markdownInput);

        expect(result).toEqual({
          title: 'Plan Without Steps',
          description: 'This plan has a title and description but no steps.',
          steps: []
        });
      });

      it('should handle steps without todos', () => {
        const markdownInput = `# Plan with Empty Steps

## Step 1: Empty Step

Step description but no todos.

## Step 2: Another Empty Step

### Todo List

## Step 3: Step with Todos

### Todo List
- [ ] Actual todo`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0].todos).toEqual([]);
        expect(result.steps[1].todos).toEqual([]);
        expect(result.steps[2].todos).toEqual(['Actual todo']);
      });

      it('should handle malformed todo items', () => {
        const markdownInput = `# Malformed Todos Plan

## Step 1: Mixed Format Todos

### Todo List
- [ ] Normal todo
- [x] Completed todo
- [ ]
- [ ]   
- [ ] Todo with extra spaces   
- [y] Invalid checkbox
- Normal text without checkbox
- [ ] Valid todo after invalid ones`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps[0].todos).toEqual([
          'Normal todo',
          'Completed todo',
          'Todo with extra spaces',
          'Valid todo after invalid ones'
        ]);
      });

      it('should handle multiple consecutive empty lines', () => {
        const markdownInput = `# Plan With Extra Spacing



## Step 1: Spaced Step



Step description with spacing.



### Todo List


- [ ] Todo one


- [ ] Todo two



## Step 2: Another Spaced Step

### Todo List
- [ ] Todo three`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps).toHaveLength(2);
        expect(result.steps[0].todos).toEqual(['Todo one', 'Todo two']);
        expect(result.steps[1].todos).toEqual(['Todo three']);
      });

      it('should handle mixed markdown formatting', () => {
        const markdownInput = `# Plan with Mixed Formatting

This is the **description** with *italic* text and \`code\`.

## Step 1: **Bold Step Title**

Step description with [link](http://example.com) and other \`markdown\`.

### Todo List
- [ ] Todo with **bold** text
- [ ] Todo with *italic* text  
- [ ] Todo with \`code\` snippet
- [ ] Todo with [link](http://example.com)

## Step 2: Step with Code Block

\`\`\`javascript
function example() {
  return 'code';
}
\`\`\`

### Todo List
- [ ] Implement function
- [ ] Test function`;

        const result = parsePlanResponse(markdownInput);

        expect(result.title).toBe('Plan with Mixed Formatting');
        expect(result.description).toBe(
          'This is the **description** with *italic* text and `code`.'
        );
        expect(result.steps).toHaveLength(2);
        expect(result.steps[0].title).toBe('Step 1: **Bold Step Title**');
        expect(result.steps[0].todos).toEqual([
          'Todo with **bold** text',
          'Todo with *italic* text',
          'Todo with `code` snippet',
          'Todo with [link](http://example.com)'
        ]);
      });
    });

    describe('Complex parsing scenarios', () => {
      it('should handle deeply nested content and multiple todo sections', () => {
        const markdownInput = `# Complex Nested Plan

Complex project with multiple phases.

## Step 1: Phase One

First phase description.

### Todo List
- [ ] Task 1.1
- [ ] Task 1.2

Some additional text that should be ignored.

### Another Section
This should be ignored as it's not a todo list.

## Step 2: Phase Two

### Todo List
- [ ] Task 2.1

### Todo List
- [ ] Task 2.2 (second todo section should be ignored)

## Step 3: Phase Three

### Todo List
- [ ] Task 3.1
- [ ] Task 3.2
- [ ] Task 3.3`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0].todos).toEqual(['Task 1.1', 'Task 1.2']);
        expect(result.steps[1].todos).toEqual(['Task 2.1']); // Only first todo section should be parsed
        expect(result.steps[2].todos).toEqual(['Task 3.1', 'Task 3.2', 'Task 3.3']);
      });

      it('should handle Unicode and special characters', () => {
        const markdownInput = `# 项目计划 (Project Plan) 🚀

使用中文的项目描述。

## Step 1: 环境设置 (Environment Setup)

设置开发环境的详细描述。

### Todo List
- [ ] 安装 Node.js
- [ ] 配置 Git 仓库
- [ ] 设置 IDE

## Step 2: Développement Frontend

Description en français avec des accents.

### Todo List
- [ ] Créer des composants React
- [ ] Ajouter des styles CSS
- [ ] Tester l'interface utilisateur

## Step 3: العمل الخلفي (Backend Work)

### Todo List
- [ ] إعداد قاعدة البيانات
- [ ] إنشاء APIs
- [ ] اختبار الوظائف

## Step 4: Emojis and Special Chars 🎉

### Todo List
- [ ] Add emoji support 😊
- [ ] Handle special chars: @#$%^&*()
- [ ] Test unicode: αβγ δεζ ηθι`;

        const result = parsePlanResponse(markdownInput);

        expect(result.title).toBe('项目计划 (Project Plan) 🚀');
        expect(result.description).toBe('使用中文的项目描述。');
        expect(result.steps).toHaveLength(4);
        expect(result.steps[0].title).toBe('Step 1: 环境设置 (Environment Setup)');
        expect(result.steps[0].todos).toEqual(['安装 Node.js', '配置 Git 仓库', '设置 IDE']);
        expect(result.steps[3].todos).toEqual([
          'Add emoji support 😊',
          'Handle special chars: @#$%^&*()',
          'Test unicode: αβγ δεζ ηθι'
        ]);
      });

      it('should handle very long content lines', () => {
        const longTitle = 'A'.repeat(1000);
        const longDescription = 'B'.repeat(2000);
        const longStepTitle = 'C'.repeat(500);
        const longTodo = 'D'.repeat(1500);

        const markdownInput = `# ${longTitle}

${longDescription}

## Step 1: ${longStepTitle}

### Todo List
- [ ] ${longTodo}
- [ ] Normal todo`;

        const result = parsePlanResponse(markdownInput);

        expect(result.title).toBe(longTitle);
        expect(result.description).toBe(longDescription);
        expect(result.steps[0].title).toBe(`Step 1: ${longStepTitle}`);
        expect(result.steps[0].todos).toEqual([longTodo, 'Normal todo']);
      });

      it('should handle irregular step numbering and naming', () => {
        const markdownInput = `# Irregular Step Plan

## Step A: First Phase
### Todo List
- [ ] Todo A1

## Phase 2: Second Phase  
### Todo List
- [ ] Todo B1

## Step 3.1: Sub-phase
### Todo List
- [ ] Todo C1

## Final Step: Conclusion
### Todo List
- [ ] Todo D1

## Step without number
### Todo List
- [ ] Todo E1`;

        const result = parsePlanResponse(markdownInput);

        expect(result.steps).toHaveLength(5);
        expect(result.steps[0].title).toBe('Step A: First Phase');
        expect(result.steps[1].title).toBe('Phase 2: Second Phase');
        expect(result.steps[2].title).toBe('Step 3.1: Sub-phase');
        expect(result.steps[3].title).toBe('Final Step: Conclusion');
        expect(result.steps[4].title).toBe('Step without number');
      });
    });

    describe('Description parsing edge cases', () => {
      it('should handle multiple description paragraphs', () => {
        const markdownInput = `# Plan with Multiple Descriptions

First description paragraph.

This should not be part of description.

## Step 1: Test Step

Step description here.

More step description.

### Todo List
- [ ] Test todo`;

        const result = parsePlanResponse(markdownInput);

        expect(result.description).toBe('First description paragraph.');
        expect(result.steps[0].description).toBe('Step description here.');
      });

      it('should handle main description that spans multiple lines', () => {
        const markdownInput = `# Multi-line Description Plan

This is the first line of description.
This is the second line.
This is the third line.

## Step 1: Test Step

### Todo List
- [ ] Test todo`;

        const result = parsePlanResponse(markdownInput);

        // Only the first line should be captured as description
        expect(result.description).toBe('This is the first line of description.');
      });
    });
  });

  describe('formatPlanContent', () => {
    describe('Basic formatting', () => {
      it('should format a complete plan with all elements', () => {
        const plan: TaskPlan = {
          title: 'Complete Development Plan',
          description: 'A comprehensive plan for software development.',
          steps: [
            {
              title: 'Setup Environment',
              description: 'Initialize development workspace.',
              todos: ['Install Node.js', 'Setup Git', 'Configure IDE']
            },
            {
              title: 'Development Phase',
              description: 'Core development activities.',
              todos: ['Write code', 'Test features', 'Debug issues']
            },
            {
              title: 'Deployment',
              todos: ['Build application', 'Deploy to production']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# Complete Development Plan

A comprehensive plan for software development.

## Step 1: Setup Environment

Initialize development workspace.

### Todo List
- [ ] Install Node.js
- [ ] Setup Git
- [ ] Configure IDE

## Step 2: Development Phase

Core development activities.

### Todo List
- [ ] Write code
- [ ] Test features
- [ ] Debug issues

## Step 3: Deployment

### Todo List
- [ ] Build application
- [ ] Deploy to production`;

        expect(result).toBe(expected);
      });

      it('should format plan without main description', () => {
        const plan: TaskPlan = {
          title: 'Simple Plan',
          steps: [
            {
              title: 'Single Step',
              todos: ['First todo', 'Second todo']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# Simple Plan

## Step 1: Single Step

### Todo List
- [ ] First todo
- [ ] Second todo`;

        expect(result).toBe(expected);
      });

      it('should format plan without step descriptions', () => {
        const plan: TaskPlan = {
          title: 'Plan Without Step Descriptions',
          description: 'Main description exists.',
          steps: [
            {
              title: 'Step One',
              todos: ['Todo 1', 'Todo 2']
            },
            {
              title: 'Step Two',
              todos: ['Todo 3']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# Plan Without Step Descriptions

Main description exists.

## Step 1: Step One

### Todo List
- [ ] Todo 1
- [ ] Todo 2

## Step 2: Step Two

### Todo List
- [ ] Todo 3`;

        expect(result).toBe(expected);
      });

      it('should handle empty todos list', () => {
        const plan: TaskPlan = {
          title: 'Plan with Empty Steps',
          steps: [
            {
              title: 'Step with Todos',
              todos: ['One todo']
            },
            {
              title: 'Step without Todos',
              todos: []
            },
            {
              title: 'Another Step with Todos',
              todos: ['Another todo']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# Plan with Empty Steps

## Step 1: Step with Todos

### Todo List
- [ ] One todo

## Step 2: Step without Todos

## Step 3: Another Step with Todos

### Todo List
- [ ] Another todo`;

        expect(result).toBe(expected);
      });
    });

    describe('Edge cases and special content', () => {
      it('should handle empty plan', () => {
        const plan: TaskPlan = {
          title: '',
          steps: []
        };

        const result = formatPlanContent(plan);

        expect(result).toBe('#');
      });

      it('should handle plan with only title', () => {
        const plan: TaskPlan = {
          title: 'Title Only Plan',
          steps: []
        };

        const result = formatPlanContent(plan);

        expect(result).toBe('# Title Only Plan');
      });

      it('should handle special characters and Unicode', () => {
        const plan: TaskPlan = {
          title: '特殊字符计划 🚀 & Special Chars',
          description: 'Description with émojis 🎉 and ñ accënts',
          steps: [
            {
              title: 'Stëp with Ümlauts',
              description: 'Description with 中文 characters',
              todos: ['Todo with émojis 😊', 'Todo with symbols @#$%', 'Todo with Unicode αβγ']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# 特殊字符计划 🚀 & Special Chars

Description with émojis 🎉 and ñ accënts

## Step 1: Stëp with Ümlauts

Description with 中文 characters

### Todo List
- [ ] Todo with émojis 😊
- [ ] Todo with symbols @#$%
- [ ] Todo with Unicode αβγ`;

        expect(result).toBe(expected);
      });

      it('should handle very long content', () => {
        const longTitle = 'Long Title ' + 'A'.repeat(500);
        const longDescription = 'Long Description ' + 'B'.repeat(1000);
        const longStepTitle = 'Long Step ' + 'C'.repeat(300);
        const longTodo = 'Long Todo ' + 'D'.repeat(800);

        const plan: TaskPlan = {
          title: longTitle,
          description: longDescription,
          steps: [
            {
              title: longStepTitle,
              todos: [longTodo, 'Normal todo']
            }
          ]
        };

        const result = formatPlanContent(plan);

        expect(result).toContain(longTitle);
        expect(result).toContain(longDescription);
        expect(result).toContain(longStepTitle);
        expect(result).toContain(longTodo);
        expect(result).toContain('Normal todo');
      });

      it('should handle content with newlines and special formatting', () => {
        const plan: TaskPlan = {
          title: 'Plan with Newlines',
          description: 'Description\nwith\nnewlines',
          steps: [
            {
              title: 'Step\nwith\nnewlines',
              description: 'Step description\nwith multiple\nlines',
              todos: ['Todo\nwith\nnewlines', 'Normal todo']
            }
          ]
        };

        const result = formatPlanContent(plan);

        expect(result).toContain('Description\nwith\nnewlines');
        expect(result).toContain('Step\nwith\nnewlines');
        expect(result).toContain('Step description\nwith multiple\nlines');
        expect(result).toContain('Todo\nwith\nnewlines');
      });

      it('should handle markdown characters in content', () => {
        const plan: TaskPlan = {
          title: 'Plan with **bold** and *italic*',
          description: 'Description with `code` and [links](http://example.com)',
          steps: [
            {
              title: 'Step with **formatting**',
              description: 'Description with *emphasis* and `code`',
              todos: [
                'Todo with **bold** text',
                'Todo with *italic* text',
                'Todo with `code` snippet',
                'Todo with [link](http://example.com)'
              ]
            }
          ]
        };

        const result = formatPlanContent(plan);

        expect(result).toContain('Plan with **bold** and *italic*');
        expect(result).toContain('Description with `code` and [links](http://example.com)');
        expect(result).toContain('Step with **formatting**');
        expect(result).toContain('Description with *emphasis* and `code`');
        expect(result).toContain('Todo with **bold** text');
        expect(result).toContain('Todo with [link](http://example.com)');
      });

      it('should handle single step', () => {
        const plan: TaskPlan = {
          title: 'Single Step Plan',
          steps: [
            {
              title: 'Only Step',
              description: 'The one and only step',
              todos: ['Single todo']
            }
          ]
        };

        const result = formatPlanContent(plan);

        const expected = `# Single Step Plan

## Step 1: Only Step

The one and only step

### Todo List
- [ ] Single todo`;

        expect(result).toBe(expected);
      });

      it('should handle many steps', () => {
        const steps: PlanStep[] = [];
        for (let i = 1; i <= 20; i++) {
          steps.push({
            title: `Step ${i}`,
            todos: [`Todo ${i}.1`, `Todo ${i}.2`]
          });
        }

        const plan: TaskPlan = {
          title: 'Many Steps Plan',
          steps
        };

        const result = formatPlanContent(plan);

        expect(result).toContain('## Step 1: Step 1');
        expect(result).toContain('## Step 10: Step 10');
        expect(result).toContain('## Step 20: Step 20');
        expect(result).toContain('- [ ] Todo 1.1');
        expect(result).toContain('- [ ] Todo 20.2');
      });
    });
  });

  describe('validatePlanStructure', () => {
    describe('Valid plan validation', () => {
      it('should return true for valid complete plan', () => {
        const validPlan: TaskPlan = {
          title: 'Valid Plan',
          description: 'A valid plan description',
          steps: [
            {
              title: 'Step 1',
              description: 'Step description',
              todos: ['Todo 1', 'Todo 2']
            },
            {
              title: 'Step 2',
              todos: ['Todo 3']
            }
          ]
        };

        expect(validatePlanStructure(validPlan)).toBe(true);
      });

      it('should return true for valid minimal plan', () => {
        const minimalPlan: TaskPlan = {
          title: 'Minimal Plan',
          steps: [
            {
              title: 'Single Step',
              todos: ['Single Todo']
            }
          ]
        };

        expect(validatePlanStructure(minimalPlan)).toBe(true);
      });

      it('should return true for plan with multiple steps and todos', () => {
        const multiStepPlan: TaskPlan = {
          title: 'Multi-step Plan',
          steps: [
            {
              title: 'First Step',
              todos: ['Todo 1', 'Todo 2', 'Todo 3']
            },
            {
              title: 'Second Step',
              todos: ['Todo 4']
            },
            {
              title: 'Third Step',
              todos: ['Todo 5', 'Todo 6']
            }
          ]
        };

        expect(validatePlanStructure(multiStepPlan)).toBe(true);
      });
    });

    describe('Invalid plan validation', () => {
      it('should return false for plan without title', () => {
        const noTitlePlan: TaskPlan = {
          title: '',
          steps: [
            {
              title: 'Step 1',
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(noTitlePlan)).toBe(false);
      });

      it('should return false for plan with null title', () => {
        const nullTitlePlan: TaskPlan = {
          title: null as any,
          steps: [
            {
              title: 'Step 1',
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(nullTitlePlan)).toBe(false);
      });

      it('should return false for plan with undefined title', () => {
        const undefinedTitlePlan: TaskPlan = {
          title: undefined as any,
          steps: [
            {
              title: 'Step 1',
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(undefinedTitlePlan)).toBe(false);
      });

      it('should return false for plan without steps', () => {
        const noStepsPlan: TaskPlan = {
          title: 'Plan Without Steps',
          steps: []
        };

        expect(validatePlanStructure(noStepsPlan)).toBe(false);
      });

      it('should return false for plan with null steps', () => {
        const nullStepsPlan: TaskPlan = {
          title: 'Plan With Null Steps',
          steps: null as any
        };

        expect(validatePlanStructure(nullStepsPlan)).toBe(false);
      });

      it('should return false for plan with undefined steps', () => {
        const undefinedStepsPlan: TaskPlan = {
          title: 'Plan With Undefined Steps',
          steps: undefined as any
        };

        expect(validatePlanStructure(undefinedStepsPlan)).toBe(false);
      });

      it('should return false for step without title', () => {
        const stepNoTitlePlan: TaskPlan = {
          title: 'Plan with Invalid Step',
          steps: [
            {
              title: '',
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(stepNoTitlePlan)).toBe(false);
      });

      it('should return false for step with null title', () => {
        const stepNullTitlePlan: TaskPlan = {
          title: 'Plan with Null Step Title',
          steps: [
            {
              title: null as any,
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(stepNullTitlePlan)).toBe(false);
      });

      it('should return false for step without todos', () => {
        const stepNoTodosPlan: TaskPlan = {
          title: 'Plan with Step Without Todos',
          steps: [
            {
              title: 'Step Without Todos',
              todos: []
            }
          ]
        };

        expect(validatePlanStructure(stepNoTodosPlan)).toBe(false);
      });

      it('should return false for step with null todos', () => {
        const stepNullTodosPlan: TaskPlan = {
          title: 'Plan with Null Todos',
          steps: [
            {
              title: 'Step with Null Todos',
              todos: null as any
            }
          ]
        };

        expect(validatePlanStructure(stepNullTodosPlan)).toBe(false);
      });

      it('should return false for step with undefined todos', () => {
        const stepUndefinedTodosPlan: TaskPlan = {
          title: 'Plan with Undefined Todos',
          steps: [
            {
              title: 'Step with Undefined Todos',
              todos: undefined as any
            }
          ]
        };

        expect(validatePlanStructure(stepUndefinedTodosPlan)).toBe(false);
      });

      it('should return false when one step is invalid among valid steps', () => {
        const mixedValidityPlan: TaskPlan = {
          title: 'Mixed Validity Plan',
          steps: [
            {
              title: 'Valid Step',
              todos: ['Valid Todo']
            },
            {
              title: '',
              todos: ['Invalid Step - No Title']
            },
            {
              title: 'Another Valid Step',
              todos: ['Another Valid Todo']
            }
          ]
        };

        expect(validatePlanStructure(mixedValidityPlan)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle plan with whitespace-only title', () => {
        const whitespaceTitlePlan: TaskPlan = {
          title: '   \t\n   ',
          steps: [
            {
              title: 'Step 1',
              todos: ['Todo 1']
            }
          ]
        };

        // Whitespace-only title should be considered invalid
        expect(validatePlanStructure(whitespaceTitlePlan)).toBe(false);
      });

      it('should handle step with whitespace-only title', () => {
        const whitespaceStepTitlePlan: TaskPlan = {
          title: 'Valid Plan Title',
          steps: [
            {
              title: '   \t\n   ',
              todos: ['Todo 1']
            }
          ]
        };

        expect(validatePlanStructure(whitespaceStepTitlePlan)).toBe(false);
      });

      it('should handle todos with empty strings', () => {
        const emptyTodosPlan: TaskPlan = {
          title: 'Plan with Empty Todos',
          steps: [
            {
              title: 'Step with Mixed Todos',
              todos: ['Valid Todo', '', 'Another Valid Todo']
            }
          ]
        };

        // Plan should still be valid even with empty todo items
        expect(validatePlanStructure(emptyTodosPlan)).toBe(true);
      });

      it('should handle very large valid plan', () => {
        const steps: PlanStep[] = [];
        for (let i = 1; i <= 100; i++) {
          const todos: string[] = [];
          for (let j = 1; j <= 10; j++) {
            todos.push(`Todo ${i}.${j}`);
          }
          steps.push({
            title: `Step ${i}`,
            todos
          });
        }

        const largePlan: TaskPlan = {
          title: 'Large Valid Plan',
          steps
        };

        expect(validatePlanStructure(largePlan)).toBe(true);
      });
    });
  });

  describe('extractStepFromMarkdown', () => {
    const sampleMarkdown = `# Sample Plan

## Step 1: First Step
### Todo List
- [ ] First todo

## Step 2: Second Step
### Todo List
- [ ] Second todo

## Step 3: Third Step
### Todo List
- [ ] Third todo`;

    describe('Valid extraction', () => {
      it('should extract first step correctly', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, 0);

        expect(result).toEqual({
          title: 'Step 1: First Step',
          todos: ['First todo']
        });
      });

      it('should extract middle step correctly', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, 1);

        expect(result).toEqual({
          title: 'Step 2: Second Step',
          todos: ['Second todo']
        });
      });

      it('should extract last step correctly', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, 2);

        expect(result).toEqual({
          title: 'Step 3: Third Step',
          todos: ['Third todo']
        });
      });
    });

    describe('Invalid extraction', () => {
      it('should return null for negative index', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, -1);
        expect(result).toBeNull();
      });

      it('should return null for index out of bounds', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, 5);
        expect(result).toBeNull();
      });

      it('should return null for index equal to steps length', () => {
        const result = extractStepFromMarkdown(sampleMarkdown, 3);
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle empty markdown', () => {
        const result = extractStepFromMarkdown('', 0);
        expect(result).toBeNull();
      });

      it('should handle markdown with no steps', () => {
        const noStepsMarkdown = '# Plan Without Steps\n\nJust a description.';
        const result = extractStepFromMarkdown(noStepsMarkdown, 0);
        expect(result).toBeNull();
      });

      it('should handle single step markdown', () => {
        const singleStepMarkdown = `# Single Step Plan

## Step 1: Only Step
### Todo List
- [ ] Only todo`;

        const result = extractStepFromMarkdown(singleStepMarkdown, 0);
        expect(result).toEqual({
          title: 'Step 1: Only Step',
          todos: ['Only todo']
        });

        const invalidResult = extractStepFromMarkdown(singleStepMarkdown, 1);
        expect(invalidResult).toBeNull();
      });

      it('should handle step with complex content', () => {
        const complexMarkdown = `# Complex Plan

## Step 1: Complex Step
Step description with details.

### Todo List
- [ ] Todo with **bold** text
- [ ] Todo with *italic* text
- [ ] Todo with \`code\`

## Step 2: Another Step
### Todo List
- [ ] Normal todo`;

        const result = extractStepFromMarkdown(complexMarkdown, 0);
        expect(result).toEqual({
          title: 'Step 1: Complex Step',
          description: 'Step description with details.',
          todos: ['Todo with **bold** text', 'Todo with *italic* text', 'Todo with `code`']
        });
      });
    });
  });

  describe('updateStepInPlan', () => {
    const basePlan: TaskPlan = {
      title: 'Base Plan',
      steps: [
        { title: 'Step 1', todos: ['Todo 1.1', 'Todo 1.2'] },
        { title: 'Step 2', todos: ['Todo 2.1'] },
        { title: 'Step 3', todos: ['Todo 3.1', 'Todo 3.2', 'Todo 3.3'] }
      ]
    };

    describe('Valid updates', () => {
      it('should update first step', () => {
        const updatedStep: PlanStep = {
          title: 'Updated Step 1',
          description: 'New description',
          todos: ['New Todo 1.1', 'New Todo 1.2', 'New Todo 1.3']
        };

        const result = updateStepInPlan(basePlan, 0, updatedStep);

        expect(result.steps[0]).toEqual(updatedStep);
        expect(result.steps[1]).toEqual(basePlan.steps[1]); // Unchanged
        expect(result.steps[2]).toEqual(basePlan.steps[2]); // Unchanged
        expect(result.title).toBe(basePlan.title); // Plan title unchanged
      });

      it('should update middle step', () => {
        const updatedStep: PlanStep = {
          title: 'Updated Step 2',
          todos: ['Updated Todo 2.1', 'Added Todo 2.2']
        };

        const result = updateStepInPlan(basePlan, 1, updatedStep);

        expect(result.steps[0]).toEqual(basePlan.steps[0]); // Unchanged
        expect(result.steps[1]).toEqual(updatedStep);
        expect(result.steps[2]).toEqual(basePlan.steps[2]); // Unchanged
      });

      it('should update last step', () => {
        const updatedStep: PlanStep = {
          title: 'Updated Step 3',
          description: 'Updated description for last step',
          todos: ['Single updated todo']
        };

        const result = updateStepInPlan(basePlan, 2, updatedStep);

        expect(result.steps[0]).toEqual(basePlan.steps[0]); // Unchanged
        expect(result.steps[1]).toEqual(basePlan.steps[1]); // Unchanged
        expect(result.steps[2]).toEqual(updatedStep);
      });

      it('should not mutate original plan', () => {
        const originalStepsLength = basePlan.steps.length;
        const originalFirstStep = { ...basePlan.steps[0] };

        const updatedStep: PlanStep = {
          title: 'Completely New Step',
          todos: ['New todo']
        };

        const result = updateStepInPlan(basePlan, 0, updatedStep);

        // Original plan should be unchanged
        expect(basePlan.steps.length).toBe(originalStepsLength);
        expect(basePlan.steps[0]).toEqual(originalFirstStep);

        // Result should be different
        expect(result.steps[0]).toEqual(updatedStep);
        expect(result.steps[0]).not.toEqual(originalFirstStep);
      });
    });

    describe('Invalid updates', () => {
      it('should return original plan for negative index', () => {
        const updatedStep: PlanStep = {
          title: 'Should Not Update',
          todos: ['Should not appear']
        };

        const result = updateStepInPlan(basePlan, -1, updatedStep);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
      });

      it('should return original plan for index out of bounds', () => {
        const updatedStep: PlanStep = {
          title: 'Out of Bounds Step',
          todos: ['Out of bounds todo']
        };

        const result = updateStepInPlan(basePlan, 5, updatedStep);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
      });

      it('should return original plan for index equal to steps length', () => {
        const updatedStep: PlanStep = {
          title: 'Equal to Length Step',
          todos: ['Equal length todo']
        };

        const result = updateStepInPlan(basePlan, basePlan.steps.length, updatedStep);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty plan', () => {
        const emptyPlan: TaskPlan = {
          title: 'Empty Plan',
          steps: []
        };

        const updatedStep: PlanStep = {
          title: 'New Step',
          todos: ['New todo']
        };

        const result = updateStepInPlan(emptyPlan, 0, updatedStep);

        expect(result).toEqual(emptyPlan);
        expect(result.steps).toEqual([]);
      });

      it('should handle single step plan', () => {
        const singleStepPlan: TaskPlan = {
          title: 'Single Step Plan',
          steps: [{ title: 'Only Step', todos: ['Only todo'] }]
        };

        const updatedStep: PlanStep = {
          title: 'Updated Only Step',
          description: 'Now with description',
          todos: ['Updated todo', 'Additional todo']
        };

        const result = updateStepInPlan(singleStepPlan, 0, updatedStep);

        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]).toEqual(updatedStep);
      });

      it('should preserve plan description and title', () => {
        const planWithDescription: TaskPlan = {
          title: 'Plan With Description',
          description: 'Important plan description',
          steps: [{ title: 'Step', todos: ['Todo'] }]
        };

        const updatedStep: PlanStep = {
          title: 'Updated Step',
          todos: ['Updated todo']
        };

        const result = updateStepInPlan(planWithDescription, 0, updatedStep);

        expect(result.title).toBe('Plan With Description');
        expect(result.description).toBe('Important plan description');
        expect(result.steps[0]).toEqual(updatedStep);
      });
    });
  });

  describe('addStepToPlan', () => {
    const basePlan: TaskPlan = {
      title: 'Base Plan',
      steps: [
        { title: 'Step 1', todos: ['Todo 1'] },
        { title: 'Step 2', todos: ['Todo 2'] },
        { title: 'Step 3', todos: ['Todo 3'] }
      ]
    };

    describe('Adding without index (append)', () => {
      it('should append step to end when no index provided', () => {
        const newStep: PlanStep = {
          title: 'New Last Step',
          description: 'Added to end',
          todos: ['New todo']
        };

        const result = addStepToPlan(basePlan, newStep);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[0]).toEqual(basePlan.steps[0]);
        expect(result.steps[1]).toEqual(basePlan.steps[1]);
        expect(result.steps[2]).toEqual(basePlan.steps[2]);
        expect(result.steps[3]).toEqual(newStep);
      });

      it('should append step when insertIndex is undefined', () => {
        const newStep: PlanStep = {
          title: 'Undefined Index Step',
          todos: ['Undefined index todo']
        };

        const result = addStepToPlan(basePlan, newStep, undefined);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[3]).toEqual(newStep);
      });
    });

    describe('Adding with specific index (insert)', () => {
      it('should insert step at beginning (index 0)', () => {
        const newStep: PlanStep = {
          title: 'New First Step',
          todos: ['First todo']
        };

        const result = addStepToPlan(basePlan, newStep, 0);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[0]).toEqual(newStep);
        expect(result.steps[1]).toEqual(basePlan.steps[0]);
        expect(result.steps[2]).toEqual(basePlan.steps[1]);
        expect(result.steps[3]).toEqual(basePlan.steps[2]);
      });

      it('should insert step in middle', () => {
        const newStep: PlanStep = {
          title: 'New Middle Step',
          description: 'Inserted in middle',
          todos: ['Middle todo']
        };

        const result = addStepToPlan(basePlan, newStep, 1);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[0]).toEqual(basePlan.steps[0]);
        expect(result.steps[1]).toEqual(newStep);
        expect(result.steps[2]).toEqual(basePlan.steps[1]);
        expect(result.steps[3]).toEqual(basePlan.steps[2]);
      });

      it('should insert step between second and third steps', () => {
        const newStep: PlanStep = {
          title: 'Between 2 and 3',
          todos: ['Between todo']
        };

        const result = addStepToPlan(basePlan, newStep, 2);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[0]).toEqual(basePlan.steps[0]);
        expect(result.steps[1]).toEqual(basePlan.steps[1]);
        expect(result.steps[2]).toEqual(newStep);
        expect(result.steps[3]).toEqual(basePlan.steps[2]);
      });

      it('should append when insertIndex equals steps length', () => {
        const newStep: PlanStep = {
          title: 'At Length Index',
          todos: ['Length index todo']
        };

        const result = addStepToPlan(basePlan, newStep, basePlan.steps.length);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[3]).toEqual(newStep);
      });
    });

    describe('Invalid index handling', () => {
      it('should append for negative index', () => {
        const newStep: PlanStep = {
          title: 'Negative Index Step',
          todos: ['Negative todo']
        };

        const result = addStepToPlan(basePlan, newStep, -1);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[3]).toEqual(newStep);
      });

      it('should append for index greater than steps length', () => {
        const newStep: PlanStep = {
          title: 'Too Large Index Step',
          todos: ['Too large todo']
        };

        const result = addStepToPlan(basePlan, newStep, 10);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[3]).toEqual(newStep);
      });
    });

    describe('Edge cases', () => {
      it('should add to empty plan', () => {
        const emptyPlan: TaskPlan = {
          title: 'Empty Plan',
          steps: []
        };

        const newStep: PlanStep = {
          title: 'First Step',
          todos: ['First todo']
        };

        const result = addStepToPlan(emptyPlan, newStep);

        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]).toEqual(newStep);
      });

      it('should add to empty plan with index 0', () => {
        const emptyPlan: TaskPlan = {
          title: 'Empty Plan',
          steps: []
        };

        const newStep: PlanStep = {
          title: 'First Step at Index 0',
          todos: ['Index 0 todo']
        };

        const result = addStepToPlan(emptyPlan, newStep, 0);

        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]).toEqual(newStep);
      });

      it('should not mutate original plan', () => {
        const originalStepsLength = basePlan.steps.length;
        const originalSteps = [...basePlan.steps];

        const newStep: PlanStep = {
          title: 'Non-mutating Step',
          todos: ['Non-mutating todo']
        };

        const result = addStepToPlan(basePlan, newStep, 1);

        // Original plan should be unchanged
        expect(basePlan.steps.length).toBe(originalStepsLength);
        expect(basePlan.steps).toEqual(originalSteps);

        // Result should be different
        expect(result.steps.length).toBe(originalStepsLength + 1);
        expect(result.steps[1]).toEqual(newStep);
      });

      it('should preserve plan metadata', () => {
        const planWithDescription: TaskPlan = {
          title: 'Plan With Metadata',
          description: 'Important description',
          steps: [{ title: 'Existing Step', todos: ['Existing todo'] }]
        };

        const newStep: PlanStep = {
          title: 'Added Step',
          todos: ['Added todo']
        };

        const result = addStepToPlan(planWithDescription, newStep);

        expect(result.title).toBe('Plan With Metadata');
        expect(result.description).toBe('Important description');
        expect(result.steps).toHaveLength(2);
      });

      it('should handle step with complex content', () => {
        const complexStep: PlanStep = {
          title: 'Complex Step with **formatting**',
          description: 'Description with *emphasis* and `code`',
          todos: ['Todo with émojis 🚀', 'Todo with unicode 中文', 'Todo with special chars @#$%']
        };

        const result = addStepToPlan(basePlan, complexStep, 1);

        expect(result.steps).toHaveLength(4);
        expect(result.steps[1]).toEqual(complexStep);
      });
    });
  });

  describe('removeStepFromPlan', () => {
    const basePlan: TaskPlan = {
      title: 'Base Plan',
      description: 'Plan with multiple steps',
      steps: [
        { title: 'Step 1', todos: ['Todo 1.1', 'Todo 1.2'] },
        { title: 'Step 2', todos: ['Todo 2.1'] },
        { title: 'Step 3', todos: ['Todo 3.1', 'Todo 3.2'] },
        { title: 'Step 4', todos: ['Todo 4.1'] }
      ]
    };

    describe('Valid removal', () => {
      it('should remove first step', () => {
        const result = removeStepFromPlan(basePlan, 0);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0]).toEqual(basePlan.steps[1]); // Original Step 2
        expect(result.steps[1]).toEqual(basePlan.steps[2]); // Original Step 3
        expect(result.steps[2]).toEqual(basePlan.steps[3]); // Original Step 4
      });

      it('should remove middle step', () => {
        const result = removeStepFromPlan(basePlan, 1);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0]).toEqual(basePlan.steps[0]); // Original Step 1
        expect(result.steps[1]).toEqual(basePlan.steps[2]); // Original Step 3
        expect(result.steps[2]).toEqual(basePlan.steps[3]); // Original Step 4
      });

      it('should remove last step', () => {
        const result = removeStepFromPlan(basePlan, 3);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0]).toEqual(basePlan.steps[0]); // Original Step 1
        expect(result.steps[1]).toEqual(basePlan.steps[1]); // Original Step 2
        expect(result.steps[2]).toEqual(basePlan.steps[2]); // Original Step 3
      });

      it('should remove second-to-last step', () => {
        const result = removeStepFromPlan(basePlan, 2);

        expect(result.steps).toHaveLength(3);
        expect(result.steps[0]).toEqual(basePlan.steps[0]); // Original Step 1
        expect(result.steps[1]).toEqual(basePlan.steps[1]); // Original Step 2
        expect(result.steps[2]).toEqual(basePlan.steps[3]); // Original Step 4
      });
    });

    describe('Invalid removal', () => {
      it('should return original plan for negative index', () => {
        const result = removeStepFromPlan(basePlan, -1);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
        expect(result.steps.length).toBe(basePlan.steps.length);
      });

      it('should return original plan for index out of bounds', () => {
        const result = removeStepFromPlan(basePlan, 5);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
        expect(result.steps.length).toBe(basePlan.steps.length);
      });

      it('should return original plan for index equal to steps length', () => {
        const result = removeStepFromPlan(basePlan, basePlan.steps.length);

        expect(result).toEqual(basePlan);
        expect(result.steps).toEqual(basePlan.steps);
        expect(result.steps.length).toBe(basePlan.steps.length);
      });
    });

    describe('Edge cases', () => {
      it('should handle removing from single step plan', () => {
        const singleStepPlan: TaskPlan = {
          title: 'Single Step Plan',
          steps: [{ title: 'Only Step', todos: ['Only todo'] }]
        };

        const result = removeStepFromPlan(singleStepPlan, 0);

        expect(result.steps).toHaveLength(0);
        expect(result.steps).toEqual([]);
        expect(result.title).toBe('Single Step Plan');
      });

      it('should handle removing from two step plan', () => {
        const twoStepPlan: TaskPlan = {
          title: 'Two Step Plan',
          steps: [
            { title: 'First Step', todos: ['First todo'] },
            { title: 'Second Step', todos: ['Second todo'] }
          ]
        };

        // Remove first step
        const result1 = removeStepFromPlan(twoStepPlan, 0);
        expect(result1.steps).toHaveLength(1);
        expect(result1.steps[0]).toEqual(twoStepPlan.steps[1]);

        // Remove second step
        const result2 = removeStepFromPlan(twoStepPlan, 1);
        expect(result2.steps).toHaveLength(1);
        expect(result2.steps[0]).toEqual(twoStepPlan.steps[0]);
      });

      it('should handle empty plan', () => {
        const emptyPlan: TaskPlan = {
          title: 'Empty Plan',
          steps: []
        };

        const result = removeStepFromPlan(emptyPlan, 0);

        expect(result).toEqual(emptyPlan);
        expect(result.steps).toEqual([]);
      });

      it('should not mutate original plan', () => {
        const originalStepsLength = basePlan.steps.length;
        const originalSteps = [...basePlan.steps];

        const result = removeStepFromPlan(basePlan, 1);

        // Original plan should be unchanged
        expect(basePlan.steps.length).toBe(originalStepsLength);
        expect(basePlan.steps).toEqual(originalSteps);

        // Result should be different
        expect(result.steps.length).toBe(originalStepsLength - 1);
        expect(result.steps).not.toContain(basePlan.steps[1]);
      });

      it('should preserve plan metadata', () => {
        const planWithMetadata: TaskPlan = {
          title: 'Plan With Metadata',
          description: 'Important description that should be preserved',
          steps: [
            { title: 'Step 1', todos: ['Todo 1'] },
            { title: 'Step 2', todos: ['Todo 2'] }
          ]
        };

        const result = removeStepFromPlan(planWithMetadata, 0);

        expect(result.title).toBe('Plan With Metadata');
        expect(result.description).toBe('Important description that should be preserved');
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]).toEqual(planWithMetadata.steps[1]);
      });

      it('should handle removing steps with complex content', () => {
        const complexPlan: TaskPlan = {
          title: 'Complex Content Plan',
          steps: [
            {
              title: 'Simple Step',
              todos: ['Simple todo']
            },
            {
              title: 'Complex Step with **formatting**',
              description: 'Description with émojis 🚀 and unicode 中文',
              todos: [
                'Todo with special chars @#$%',
                'Todo with newlines\nand\nmultiple\nlines',
                'Todo with markdown `code` and *emphasis*'
              ]
            },
            {
              title: 'Another Simple Step',
              todos: ['Another simple todo']
            }
          ]
        };

        const result = removeStepFromPlan(complexPlan, 1);

        expect(result.steps).toHaveLength(2);
        expect(result.steps[0]).toEqual(complexPlan.steps[0]);
        expect(result.steps[1]).toEqual(complexPlan.steps[2]);
        expect(result.steps).not.toContain(complexPlan.steps[1]);
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle workflow: parse -> format -> parse again', () => {
      const originalMarkdown = `# Integration Test Plan

This is a comprehensive integration test.

## Step 1: Setup Phase

Initialize the testing environment.

### Todo List
- [ ] Install dependencies
- [ ] Configure test environment
- [ ] Setup test data

## Step 2: Testing Phase

Execute the actual tests.

### Todo List
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Generate coverage report`;

      // Parse the markdown
      const parsedPlan = parsePlanResponse(originalMarkdown);

      // Format it back to markdown
      const formattedMarkdown = formatPlanContent(parsedPlan);

      // Parse again to verify consistency
      const reparsedPlan = parsePlanResponse(formattedMarkdown);

      expect(reparsedPlan).toEqual(parsedPlan);
      expect(reparsedPlan.title).toBe('Integration Test Plan');
      expect(reparsedPlan.description).toBe('This is a comprehensive integration test.');
      expect(reparsedPlan.steps).toHaveLength(2);
    });

    it('should handle workflow: parse -> validate -> modify -> validate', () => {
      const markdown = `# Validation Workflow Plan

## Step 1: Initial Step
### Todo List
- [ ] Initial todo`;

      const plan = parsePlanResponse(markdown);
      expect(validatePlanStructure(plan)).toBe(true);

      // Add a step
      const newStep: PlanStep = {
        title: 'Added Step',
        todos: ['Added todo']
      };
      const planWithAddedStep = addStepToPlan(plan, newStep);
      expect(validatePlanStructure(planWithAddedStep)).toBe(true);
      expect(planWithAddedStep.steps).toHaveLength(2);

      // Update a step
      const updatedStep: PlanStep = {
        title: 'Updated Step',
        todos: ['Updated todo']
      };
      const planWithUpdatedStep = updateStepInPlan(planWithAddedStep, 0, updatedStep);
      expect(validatePlanStructure(planWithUpdatedStep)).toBe(true);
      expect(planWithUpdatedStep.steps[0]).toEqual(updatedStep);

      // Remove a step
      const planWithRemovedStep = removeStepFromPlan(planWithUpdatedStep, 1);
      expect(validatePlanStructure(planWithRemovedStep)).toBe(true);
      expect(planWithRemovedStep.steps).toHaveLength(1);
    });

    it('should handle complex plan manipulation workflow', () => {
      // Start with a complex plan
      const initialPlan: TaskPlan = {
        title: 'Complex Manipulation Plan',
        description: 'A plan for complex manipulation testing',
        steps: [
          { title: 'Step A', todos: ['Todo A1', 'Todo A2'] },
          { title: 'Step B', todos: ['Todo B1'] },
          { title: 'Step C', todos: ['Todo C1', 'Todo C2', 'Todo C3'] }
        ]
      };

      // Extract a step
      const extractedStep = extractStepFromMarkdown(formatPlanContent(initialPlan), 1);
      expect(extractedStep).toEqual(initialPlan.steps[1]);

      // Remove the extracted step
      const planWithoutStepB = removeStepFromPlan(initialPlan, 1);
      expect(planWithoutStepB.steps).toHaveLength(2);
      expect(planWithoutStepB.steps[0].title).toBe('Step A');
      expect(planWithoutStepB.steps[1].title).toBe('Step C');

      // Add a new step in the middle
      const newMiddleStep: PlanStep = {
        title: 'New Middle Step',
        description: 'Inserted between A and C',
        todos: ['New todo 1', 'New todo 2']
      };
      const planWithNewMiddle = addStepToPlan(planWithoutStepB, newMiddleStep, 1);
      expect(planWithNewMiddle.steps).toHaveLength(3);
      expect(planWithNewMiddle.steps[1]).toEqual(newMiddleStep);

      // Update the last step
      const updatedLastStep: PlanStep = {
        title: 'Updated Step C',
        description: 'Updated description for step C',
        todos: ['Updated C1', 'Updated C2']
      };
      const finalPlan = updateStepInPlan(planWithNewMiddle, 2, updatedLastStep);
      expect(finalPlan.steps[2]).toEqual(updatedLastStep);

      // Validate the final plan
      expect(validatePlanStructure(finalPlan)).toBe(true);
      expect(finalPlan.steps).toHaveLength(3);
      expect(finalPlan.title).toBe('Complex Manipulation Plan');
    });
  });
});
