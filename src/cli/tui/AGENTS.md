## TUI

The TUI is defined using the ink npm package which converts React definitions to terminal output.

The TUI layer defines a full immersive app that takes over the running shell process. To accomidate users running
arbitrary commands while using the TUI, the `!` input serves as an escape.

At a high level, the TUI should be thought of more as a unified app than a CLI. Nevertheless, business logic, async
work, and process orchestration must live outside the UI and be accessed via hooks.

The architecture:

1. App.tsx: Main router handling navigation between screens. Owns global screen state and transitions.
2. screens/ : This directory contains feature-specific UI screens. Feature-level UI screens (full-page views).
3. components/ : This directory contains reusable UI components. No navigation logic.
4. hooks/ : This directory contains custom react hooks for state management and responsive behavior. Hooks may call
   services or CLI logic.
5. utils/ : This directory contains helper functions

To implement effective ink:

1. Avoid manual spacing to ensure graceful resizing -- use flexbox for responsive layouts
2. Centralize keyboard handling with useInput and internal state.
3. Focus on pure rendering. Async work or process orchestration should be pulled out into hooks or services.
4. Use consistent theming via theme.ts
5. Define styling, or visual text as constants. Don't inline important visual decisions buried in the code.

Rendering:

1. Do not perform async work inside components or screens
2. UI components must be pure functions of props and state
3. All side effects live in hooks

Component Design:

1. Build small, composable, reusable components
2. Separate layout from content
3. Maintain consistent visual hierarchy
4. Prefer reuse over specialization

When adding a new screen:

1. Define the screen component in `screens/`
2. Register it in `App.tsx`
3. Move all async or orchestration logic into a hook
4. Reuse existing components where possible

## Screen Patterns

All screens must use the `Screen` component wrapper. This provides exit handling, headers, and help text automatically.

1. **Simple selection screens** use `SelectScreen` - one component replaces manual useInput, Panel, and SelectList
2. **Multi-phase screens** use `Screen` with conditional content based on phase/step state
3. **Wizard flows** use `Screen` with `StepIndicator` in headerContent
4. **Prompts/modals** use `SuccessPrompt`, `ErrorPrompt`, or `ConfirmPrompt`

Never write manual exit handling (`useInput` with escape/q checks). Use `Screen` or `useExitHandler`.

Never write manual list navigation. Use `useListNavigation` or `SelectScreen`.

For future generic and re-usable components, separate them out.

## Constants

All help text strings must be defined in `constants.ts` as `HELP_TEXT.*`. Never inline help text strings.

Silent defaults are forbidden. If a value might be undefined, either throw an error or use a centrally defined constant.

## Component Hierarchy

```
Screen (exit handling, layout, help text)
  └─ ScreenHeader (bordered title + optional metadata)
  └─ Content (StepProgress, SelectList, TextInput, etc.)
  └─ Help text (from HELP_TEXT constants)

SelectScreen (for simple selection lists)
  └─ Screen + Panel + SelectList + useListNavigation (bundled)

PromptScreen / SuccessPrompt / ErrorPrompt / ConfirmPrompt
  └─ For modal-like confirmations and error displays
```

## Flow Hooks

Screens with multi-step async workflows must extract logic into a `use*Flow` hook (e.g., `usePlanFlow`, `useInitFlow`).

The hook owns:

- Phase/step state machine
- Async operations
- Error handling
- Retry logic

The screen owns:

- Rendering based on hook state
- User input that triggers hook actions

## TextInput Validation

`TextInput` supports two validation modes that can be used independently or together:

1. **`schema`** - Zod schema validation. Error message comes from the schema definition.
2. **`customValidation`** - Function returning `true` if valid, or error message string if invalid.

When both are provided, custom validation runs first, then schema validation.

```tsx
// Schema only - error message from Zod
<TextInput schema={GatewayNameSchema} />

// Custom only - returns true or error string
<TextInput customValidation={value => value === expected || 'Must match exactly'} />

// Both - custom runs first, then schema
<TextInput
  schema={GatewayNameSchema}
  customValidation={value => !existingNames.includes(value) || 'Must be unique'}
/>
```

Never duplicate error messages - they must come from Zod schemas or the `customValidation` return value.
