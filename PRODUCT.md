# Quota Zero

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Italian-speaking prospects in Rome and Lazio who need drone photography or video. The user confirmed that both audience groups have priority:

- Businesses, property owners and agents, agriturismi, and hospitality operators who need images of a place, property, or activity.
- Event organizers, sports clients, and people who need video for social channels.

Visitors need to see relevant work, understand the available deliverables, and contact Alessio about their project.

## Product Purpose

Quota Zero is Alessio Mazzetti's portfolio and enquiry website for drone photography and video work. Its primary goal is to turn interested visitors into project enquiries through WhatsApp, email, or the contact form.

No conversion baseline or numerical success target has been established.

## Positioning

The existing site presents direct access to an independent drone pilot and filmmaker based in Rome, with work primarily in Lazio. It combines real portfolio clips with an explanation of the production process and delivery options.

No exclusive market claim or competitor comparison has been confirmed.

## Operating Context

Visitors browse work, filter by category, open videos, read about services and delivery options, and make an enquiry. The site explains location checks, flight preparation, weather rescheduling, filming, and delivery.

The stated service area is Rome and Lazio. Projects farther away are evaluated individually. Location and weather affect whether and when filming can take place.

## Capabilities and Constraints

- The existing delivery options are Foto aeree, Video, and Video completo. Video provides trimmed drone footage without music or a finished edit. Video completo includes editing, color, and music.
- The homepage has portfolio filters, a video lightbox, service descriptions, audience descriptions, production steps, delivery options, an about section, FAQs, service areas, and contact options.
- The contact form has three steps: service, name, and contact details with an optional message. It accepts a phone number or email address.
- WhatsApp and email are existing contact channels. Preserve their destinations unless the owner requests a change.
- The website uses static HTML with no build step. The homepage uses the existing x-dc component runtime. Vercel serves the site and runs the contact and like APIs.
- Videos are hosted on Bunny Stream. Local poster images provide previews. Video playback and CDN libraries require a network connection.
- `python3 -m http.server 3000 --bind 127.0.0.1 --directory public` serves the static site on port 3000. It does not execute `/api/contact` or `/api/like`. API verification requires a configured development environment.
- Portfolio IDs `work-1` through `work-8` map to existing like counts. Preserve each ID's association with its work when rearranging the portfolio.
- Preserve the public domain `quotazerodrone.it`, existing Italian content, real portfolio, contact channels, and privacy access during the rehab.

## Brand Commitments

The user confirmed the Quota Zero name and Alessio Mazzetti's identity. Italian remains the visitor-facing language. Existing logos, portraits, and portfolio media are available for reuse.

The user confirmed that the rehab retains the existing dark/gold identity. Both usability and visual hierarchy are in scope, with all five review priorities included. Visual tokens and component details belong in DESIGN.md.

## Evidence on Hand

- `public/index.html` contains the current service descriptions, FAQs, delivery options, contact details, portfolio metadata, and about copy.
- `public/assets/portfolio/` contains eight real portfolio posters. Their associated video identifiers are in `WORKS` in `public/index.html`.
- `public/assets/home/hero-poster.jpg` contains the hero preview.
- `public/assets/brand/` and `public/assets/home/` contains brand assets and portraits.
- `public/privacy.html` contains the existing privacy and cookie information.
- The site states 15+ projects, a 4K delivery standard, and pilot certification details. These are existing owner-supplied claims, not independently verified evidence. Do not expand them into new guarantees.
- No testimonials, client permissions, case-study outcomes, standard prices, or response-time commitments were confirmed in this session. Do not fabricate them.

## Product Principles

- Give both audience groups a clear way to find relevant work and enquire.
- Use actual portfolio media and accurate descriptions of the deliverables.
- Keep direct contact with Alessio accessible throughout the visitor's decision.
- Explain practical constraints before a client commits to a shoot.
- Preserve working contact, video, privacy, and portfolio behavior when changing the interface.

## Open Decisions

- No audience-specific conversion targets, analytics baseline, additional languages, or product-specific accessibility standard have been confirmed.
