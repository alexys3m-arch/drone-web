---
name: Quota Zero
description: Retained dark and gold design for a drone photography and video portfolio.
colors:
  canvas: "#090a0c"
  gold: "#c9a227"
  foreground: "#f4f3f0"
  muted: "#bdbcb8"
  supporting: "#deddd9"
  rule: "rgba(244,243,240,.16)"
  error: "#e2775a"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(48px,5.8vw,84px)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(34px,4.5vw,60px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.03em"
  delivery-title:
    fontFamily: "Syne, sans-serif"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  filter-label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: ".18em"
rounded:
  control: "4px"
  service-tile: "6px"
  field: "0"
spacing:
  page: "clamp(20px,3vw,40px)"
  section: "clamp(64px,7vw,104px)"
  small-gap: "8px"
  control-gap: "12px"
  group: "24px"
  column: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.canvas}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  filter:
    backgroundColor: "transparent"
    textColor: "rgba(244,243,240,.72)"
    typography: "{typography.filter-label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
  filter-selected:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.canvas}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    height: "64px"
  service-tile:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.service-tile}"
    padding: "20px"
  navigation:
    textColor: "rgba(244,243,240,.72)"
    typography: "{typography.navigation}"
---

# Design System: Quota Zero

## Overview

Quota Zero retains its dark background, warm gold accent, local Syne and Manrope fonts, and existing brand images. Real aerial footage leads the page. Text and controls explain the work without competing with it.

This records the merged homepage in `public/index.html`. The frontmatter owns the tokens. `.impeccable/design.json` extends them with motion, breakpoints, and standalone component examples. Product facts remain in `PRODUCT.md`.

## Colors

Gold marks emphasis, enquiry links, hover states, and keyboard focus. Off-white carries headings and filled primary actions. Muted text supports descriptions and format metadata. Translucent rules separate sections. The error color appears beside invalid form fields.

Text selection uses gold with dark text. Inputs use a gold caret. The muted token corresponds to `--qz-muted`; the rule token corresponds to `--qz-rule`.

## Typography

Syne is the display and title family. Manrope carries paragraphs, controls, and metadata. Both use local font files in `public/assets/fonts/`.

The hero uses the display role. Section headings use the headline role, and delivery headings use the delivery-title role. The main paragraph measure stops at 65 characters. Project descriptions and output metadata use smaller Manrope text, with tabular numerals for durations and counts.

At the content breakpoint, hero type becomes `clamp(38px,10vw,56px)` with `-.03em` tracking. Navigation retains its compact uppercase treatment. Filter labels use sentence case.

## Layout

The main content container stops at 1500px. Hero copy has a 1420px container and sits near the bottom of the footage. Page inset and section spacing use the fluid frontmatter tokens.

On desktop, the portfolio uses twelve columns and varied spans. The all-work view preserves the existing collage. Filtered work uses six-column entries. Below 1100px, the runtime switches to one column with the original horizontal or vertical media ratio.

Section introductions use two columns. Delivery options and the process use three. At 767px and below, these groups become single columns. The two audience descriptions remain side by side. Filters form two columns, with all-work access spanning the first row. Both audience filters remain visible without horizontal scrolling.

Form service choices use two columns and become one at 520px and below. Navigation switches to a menu below 1100px. The separate 680px hero treatment strengthens the scrim, and the 1180px rule hides the desktop WhatsApp text label.

## Elevation & Depth

Sections are flat, separated by spacing and thin rules. Photography supplies most visual depth. The fixed header uses a translucent dark background and blur after scrolling. The lightbox uses a dark backdrop and a deep shadow around its media. The mobile primary contact action has a soft shadow; the adjacent WhatsApp action uses a border.

These overlays do not establish a shadow treatment for ordinary content blocks. The sidecar records the observed shadow values.

## Shapes

Buttons, filters, and media frames use the control radius. Service selection tiles use the slightly rounder service-tile radius. Text fields have square corners and a bottom rule. Delivery options are open columns with top rules.

## Components

Primary hero actions have off-white fill and dark text. Secondary actions have transparent fill and a muted border. Both turn gold on hover. Their documented heights are minimum heights. Global keyboard focus uses a gold outline with a 3px offset.

Filters use `aria-pressed` to expose selection. The selected filter has the same off-white and dark pairing as the primary action. A live status line reports the selected group and video count.

Portfolio entries pair a media button with a title, factual context, format, duration, and enquiry link. The media button opens a labelled dialog. Its focus outline sits inside the media frame. The dialog contains focus and returns it to the opener when dismissed.

Service tiles show a Syne title and Manrope description. Hover adds a faint gold tint. Selection strengthens the tint and uses a gold border. The field style keeps a bottom rule, gold focus, and readable placeholder text. Inline errors sit beside the relevant input. Text fields and the message area use an expanded focus offset.

Desktop navigation uses compact uppercase links. Mobile navigation uses larger Syne links in a full-height menu. Native FAQ disclosures retain their visible focus treatment. Reduced-motion preferences disable animations and transitions.

## Do's and Don'ts

- Do retain the existing wordmark, portraits, real footage, and local fonts.
- Do keep both audience routes visible at narrow widths.
- Do use gold for actionable emphasis and visible keyboard focus.
- Do preserve project context and format beside the media.
- Don't replace the retained palette or type pairing during routine UI work.
- Don't turn delivery descriptions into a new set of boxed cards.
- Don't hide audience filters in a horizontal scroller.
- Don't add claims, client cases, or results that the project has not supplied.
