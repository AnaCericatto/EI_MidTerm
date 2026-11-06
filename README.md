# Property Maintenance Assistant

A small, accessible, responsive web app that lets a tenant report a maintenance problem clearly to a property manager.

**Core flow:** describe the issue → choose category and urgency → submit → see confirmation.

## Screens / states

1. **Report form**: unit, optional name, category, urgency (radio cards), description with character counter.
2. **Confirmation**: reference number, summary of what was submitted, expected response time.
3. **My reports**: list of reports submitted from this browser.

## Scope

Front-end only. There is no backend, dispatch system, staff portal or email. Submissions are saved to the browser's `localStorage` and never leave the device. Response times shown on the confirmation screen are simulated.

## Run locally

No build step or dependencies. Open `index.html` in a browser.

## Accessibility features

- Skip link, landmarks (`header`, `nav`, `main`, `footer`), one `h1` per view
- Every input has a visible `<label>`; urgency is a `fieldset` with `legend`
- Error summary (`role="alert"`) with links to each invalid field, plus inline errors tied via `aria-describedby`
- Focus moves to the new view's heading on each state change; status messages announced through a polite live region
- Visible two-tone focus ring, 44px+ touch targets, urgency never conveyed by colour alone (text label and check mark)
- Respects `prefers-reduced-motion` and forced-colors mode

Automated checks do not prove full WCAG 2.2 AA conformance; manual keyboard and screen-reader testing results are in the written report.

## Credits

No third-party libraries or assets. Icons are inline SVG written for this project.
