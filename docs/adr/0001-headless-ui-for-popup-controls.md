# Popup controls are built on Headless UI

Controls that open a popup (starting with Select) get their open/close, keyboard, focus and ARIA behaviour from `@headlessui/react`, and all styling stays ours in Tailwind. We chose this over hand-rolling the listbox pattern, which is a lot of accessibility-critical code to own, and over a native `<select>`, which can't be styled to the Horaion design. Headless UI was already a dependency and is unstyled, so it doesn't compete with the Horaion colour ranges.

## Consequences

Later popup controls (Combobox, Menu, Dialog, Popover) should reach for the matching Headless UI primitive first, so that keyboard and focus behaviour stays consistent across the product.
