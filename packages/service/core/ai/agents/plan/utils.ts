import type { TaskPlan, PlanStep } from './index';

export const parsePlanResponse = (response: string): TaskPlan => {
  const lines = response.split('\n');

  let title = '';
  let description = '';
  const steps: PlanStep[] = [];

  let currentStep: PlanStep | null = null;
  let isParsingDescription = false;
  let isParsingTodos = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    // Parse main title (# Title)
    if (trimmedLine.startsWith('# ')) {
      title = trimmedLine.substring(2).trim();
      isParsingDescription = true;
      continue;
    }

    // Parse step title (## Step X: Title)
    if (trimmedLine.startsWith('## ')) {
      if (currentStep) {
        steps.push(currentStep);
      }

      const stepTitle = trimmedLine.substring(3).trim();
      currentStep = {
        title: stepTitle,
        todos: []
      };
      isParsingDescription = false;
      isParsingTodos = false;
      continue;
    }

    // Parse todo list header (### Todo List)
    if (trimmedLine.startsWith('### ') && trimmedLine.toLowerCase().includes('todo')) {
      isParsingTodos = true;
      isParsingDescription = false;
      continue;
    }

    // Parse todo items (- [ ] item)
    if (
      isParsingTodos &&
      currentStep &&
      (trimmedLine.startsWith('- [ ]') || trimmedLine.startsWith('- [x]'))
    ) {
      const todoText = trimmedLine.replace(/^- \[[x\s]\]\s*/, '').trim();
      if (todoText) {
        currentStep.todos.push(todoText);
      }
      continue;
    }

    // Parse description text
    if (isParsingDescription && !trimmedLine.startsWith('#')) {
      if (title && !description) {
        description = trimmedLine;
      }
      continue;
    }

    // Parse step description
    if (
      currentStep &&
      !isParsingTodos &&
      !trimmedLine.startsWith('#') &&
      !trimmedLine.startsWith('###')
    ) {
      if (!currentStep.description) {
        currentStep.description = trimmedLine;
      }
      continue;
    }
  }

  // Add the last step
  if (currentStep) {
    steps.push(currentStep);
  }

  return {
    title: title || 'Untitled Plan',
    description,
    steps
  };
};

export const formatPlanContent = (plan: TaskPlan): string => {
  let markdown = `# ${plan.title}\n\n`;

  if (plan.description) {
    markdown += `${plan.description}\n\n`;
  }

  plan.steps.forEach((step, index) => {
    markdown += `## Step ${index + 1}: ${step.title}\n\n`;

    if (step.description) {
      markdown += `${step.description}\n\n`;
    }

    if (step.todos.length > 0) {
      markdown += `### Todo List\n`;
      step.todos.forEach((todo) => {
        markdown += `- [ ] ${todo}\n`;
      });
      markdown += '\n';
    }
  });

  return markdown.trim();
};

export const validatePlanStructure = (plan: TaskPlan): boolean => {
  if (!plan.title) return false;
  if (!plan.steps || plan.steps.length === 0) return false;

  for (const step of plan.steps) {
    if (!step.title) return false;
    if (!step.todos || step.todos.length === 0) return false;
  }

  return true;
};

export const extractStepFromMarkdown = (markdown: string, stepIndex: number): PlanStep | null => {
  const plan = parsePlanResponse(markdown);
  if (stepIndex >= 0 && stepIndex < plan.steps.length) {
    return plan.steps[stepIndex];
  }
  return null;
};

export const updateStepInPlan = (
  plan: TaskPlan,
  stepIndex: number,
  updatedStep: PlanStep
): TaskPlan => {
  if (stepIndex >= 0 && stepIndex < plan.steps.length) {
    const newSteps = [...plan.steps];
    newSteps[stepIndex] = updatedStep;
    return {
      ...plan,
      steps: newSteps
    };
  }
  return plan;
};

export const addStepToPlan = (plan: TaskPlan, step: PlanStep, insertIndex?: number): TaskPlan => {
  const newSteps = [...plan.steps];

  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newSteps.length) {
    newSteps.splice(insertIndex, 0, step);
  } else {
    newSteps.push(step);
  }

  return {
    ...plan,
    steps: newSteps
  };
};

export const removeStepFromPlan = (plan: TaskPlan, stepIndex: number): TaskPlan => {
  if (stepIndex >= 0 && stepIndex < plan.steps.length) {
    const newSteps = [...plan.steps];
    newSteps.splice(stepIndex, 1);
    return {
      ...plan,
      steps: newSteps
    };
  }
  return plan;
};
