---
name: frontend-design
description: Create clean, production-grade ERP/admin interfaces using only shadcn/ui components and the existing project design system. Use this skill when the user asks to build or improve CRM, ERP, dashboard, admin, form, table, report, or workflow screens.
license: Complete terms in LICENSE.txt
---

This skill guides creation of minimal, practical ERP-style frontend interfaces. Implement real working code with a clean operational design, using only components available in shadcn/ui and the project's existing component wrappers.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Component Rule

Use only components from https://ui.shadcn.com/docs/components or local project components that wrap those primitives. If a needed UI pattern is not present locally, compose it from shadcn/ui primitives instead of creating a custom decorative component.

Preferred shadcn/ui building blocks for ERP screens:
- **Layout**: Sidebar, Breadcrumb, Tabs, Separator, Scroll Area, Resizable.
- **Actions**: Button, Button Group, Dropdown Menu, Context Menu, Command.
- **Forms**: Form/Field, Label, Input, Input Group, Textarea, Select, Native Select, Combobox, Checkbox, Radio Group, Switch, Date Picker, Calendar.
- **Data**: Table, Data Table, Pagination, Badge, Tooltip, Popover, Hover Card, Accordion, Collapsible.
- **Feedback**: Alert, Alert Dialog, Dialog, Sheet, Drawer, Empty, Skeleton, Spinner, Progress, Sonner/Toast.
- **Display**: Card only for bounded content blocks, Chart for business metrics, Avatar only where user identity is relevant.

When unsure whether a component exists in shadcn/ui, check the current shadcn/ui docs before introducing a new UI primitive.

## ERP Design Direction

Design for daily business work: fast scanning, clear hierarchy, predictable controls, and low visual noise. The UI should feel like a serious ERP/CRM product, not a landing page or showcase site.

Default decisions:
- Keep pages dense but readable, with clear table/form/report structure.
- Use neutral backgrounds, restrained borders, and small radius values.
- Keep visual uniformity across the whole workflow: the same radius scale, border color, button height, input height, icon size, font weight, spacing rhythm, and table density should repeat from toolbar to modal to table footer.
- Form screens must define one local control contract and apply it consistently: labels use the same size/weight/spacing, text inputs, selects, date pickers, phone inputs, segmented controls, and disabled fields share the same height, radius, border, padding, font size, placeholder color, and focus ring unless the field is intentionally multiline.
- Do not add shadows unless the existing nearby component pattern already uses them for a functional overlay or elevation state. Avoid decorative `shadow`, `shadow-sm`, `shadow-lg`, and heavy dropdown shadows on ERP list pages.
- Keep the color codes and theme already used by the project or nearby screen. Prefer existing Tailwind color choices, project theme tokens, and shadcn CSS variables over new one-off colors.
- Keep typography simple and consistent with the existing app. Do not introduce new decorative fonts.
- Use icons only where they make actions easier to scan, and keep icon style uniform within a screen. Do not mix unrelated SVG asset icons with lucide icons in the same action list unless the existing screen already requires that exact brand/icon asset.
- Use motion sparingly for state changes only. Avoid page-load theatrics and decorative animation.
- Make the main workflow usable in the first viewport when possible.
- For list pages, keep page actions and filters in one clean toolbar band whenever possible. Avoid a detached floating action row above a separate filter card unless the existing screen explicitly needs that separation.
- Align toolbar controls on one baseline with consistent height, gap, border radius, icon size, and button treatment. Primary create actions can stay blue; secondary actions should use the same bordered neutral style without shadows.
- Table shells should have one clear outer radius with `overflow-hidden` when needed, and inner header/body/footer sections should not create competing corner shapes. Pagination footers should align to the table container, use the same border/radius scale, and keep controls inset from the rounded corners on all viewport sizes.
- Toolbars must be responsive: on small screens, search, selects, date controls, filter buttons, and actions should stack or use clear two-column groups without horizontal overflow; on desktop, they can return to a compact single-row layout.
- Do not make toolbar controls shrink until labels clip. Prefer full-width controls on mobile, wrapped action groups on tablet, and constrained inline widths on desktop.

Avoid:
- Fancy hero sections, marketing-style copy, oversized headings, decorative cards, gradient blobs, glassmorphism, dramatic shadows, patterned backgrounds, custom cursors, noisy animations, and visual effects that do not help the workflow.
- New color palettes that replace the app's existing color language.
- Mixed icon treatments inside the same toolbar, table, dropdown, or action menu.
- Mixed radius sizes, mismatched button heights, table footers that visually leak past the parent border radius, or pagination controls pressed into rounded corners.
- Mixed input heights inside the same form row, selects that are taller or shorter than neighboring inputs, phone fields with different vertical padding, and segmented controls that do not align with the adjacent input height.
- Detached action bars that look unrelated to the filter/search controls.
- Toolbar layouts that only work on wide desktop or cause horizontal scrolling on mobile.
- Rebuilding standard shadcn/ui behavior manually.
- Custom controls when Button, Input, Select, Dialog, Sheet, Table, Data Table, Tabs, Dropdown Menu, or other shadcn/ui primitives fit the need.
- Nested cards and card-heavy layouts. Use cards only when they frame a specific record, metric, form group, or repeated item.

## Implementation Checklist

Before editing, inspect nearby screens and reuse existing project patterns. When building, prioritize:
- Working filters, pagination, sorting, empty states, loading states, and error states for list/report pages.
- Clear labels, validation messages, disabled states, and sensible grouping for forms.
- Consistent action placement: primary actions near page headers or form footers, row actions in dropdown menus, destructive actions behind confirmation dialogs.
- Responsive layouts that keep tables, filters, dialogs, and side panels usable on smaller screens.
- Accessibility basics from shadcn/ui: labels, focus states, keyboard navigation, and semantic structure.

The final result should be simple, clean, and business-focused.
