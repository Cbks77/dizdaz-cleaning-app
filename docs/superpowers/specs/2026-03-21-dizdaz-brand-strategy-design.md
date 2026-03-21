# DizDaz Cleaning — Brand Strategy Design Spec
**Date:** 2026-03-21
**Owner:** Jodie Francis (DizDaz Cleaning Company)
**Developer:** Curtis Brooks
**Status:** Approved for implementation

---

## Overview

A full coordinated brand strategy launch for DizDaz Cleaning Company — a Bristol-based Airbnb and short-let specialist. The goal is to simultaneously reprice to 2025/26 market rates and expand from 1 client to 3–5 new contracts within 12 months. All six deliverables are released together as one DizDaz rebrand moment.

---

## Goals

1. **Reprice** — move from 2020 rates to 2025/26 market rates in one clean announcement
2. **Grow** — win 3–5 new B2B contracts (property managers, Airbnb operators, short-let hosts) in Bristol within 12 months
3. **Professionalise** — make DizDaz look and feel like a serious, established cleaning company at every touchpoint

---

## Brand Positioning

**Positioning statement:**
> DizDaz is Bristol's specialist cleaning company for Airbnb hosts and short-let property operators — delivering guest-ready standards, on time, every time.

**Brand tone:** Friendly & Confident — warm enough to build trust, professional enough to win B2B contracts.

**Competitive advantages (all six):**
1. Airbnb / short-let specialist — not a general cleaner
2. Reliable & consistent — same team, same standard every time
3. Flexible hours — 10am–3pm, within the checkout/check-in window
4. Trusted track record — existing contract with YourApartment
5. Local Bristol team — fast response, knows the area
6. Tech-enabled operations — custom invoicing app, digital logs, AI-powered tracking

**Target clients:**
- Serviced apartment operators (e.g. YourApartment, similar companies)
- Airbnb management companies (managing multiple properties)
- Individual Airbnb hosts with 2+ properties in Bristol
- Property managers for short-let portfolios

---

## Pricing — 2025/26 Rates

| Room Type | 2020 Rate | 2025/26 Rate | Change |
|-----------|-----------|--------------|--------|
| Berkeley Sq — Small (rooms 6, 9) | £12.50 | £18.00 | +44% |
| Berkeley Sq — Mid (rooms 2,3,8,10,12–15) | £15.00 | £22.00 | +47% |
| Berkeley Sq — Large (rooms 1,4,5,7,11) | £22.50 | £32.00 | +42% |
| Brunel Loft (rooms 1, 2, 3) | TBC | £25.00 | New |

**Rationale:** UK CPI cumulative inflation 2020–2025 is ~30%. Bristol short-let cleaning market currently averages £18–£35/room. New rates reflect inflation plus a market-rate premium consistent with DizDaz's specialist positioning.

**Repricing approach:** One-time, immediate. Backed by the rebrand. 30 days notice to existing clients.

**Revenue impact:**
- Current estimated monthly (YourApartment): ~£3,960
- New monthly at 2025/26 rates: ~£5,500
- Increase from repricing alone: +£1,540/month
- Add 3 new similar contracts: +£6,160/month over current

---

## Deliverables

### 01 — Brand Strategy Document
A master reference document covering: positioning statement, brand voice and tone, target client profiles, competitive advantage hierarchy, brand do's and don'ts. Saved to Notion (DizDaz project page) and dizdaz-brand repo.

### 02 — Price Increase Letter
Professional letter from Jodie Francis to YourApartment (addressed to Attila/Jorge). Announces new 2025/26 rates effective 30 days from send date. Warm tone, acknowledges the long relationship, frames the increase around 5 years of service and rising operational costs. Built as HTML + downloadable PDF.

**Key elements:**
- Personal, warm opening acknowledging the partnership
- Clear table of old vs new rates
- Effective date (30 days from sending)
- Contact details for any questions
- DizDaz logo and branding

### 03 — Service Sheet
One-page HTML document (also downloadable as PDF). The DizDaz sales leave-behind. Covers: what DizDaz does, who it's for, service features (specialist, reliable, flexible, tech-enabled), new pricing, contact details. Works printed or sent digitally to prospects.

**Key elements:**
- Hero statement (positioning)
- 6 competitive advantages (icon + one-liner each)
- Pricing table (2025/26 rates)
- Contact: 07914 101113 / dizdazcleaning@gmail.com / @dizdazcleaning
- DizDaz logo and full branding

### 04 — Landing Page (Website)
Single-page website deployed to Vercel. The destination when someone Googles "DizDaz Bristol" or clicks an Instagram link. Built as a single HTML file consistent with DizDaz's existing tech approach.

**Sections:**
1. Hero — headline, subheading, CTA ("Get a quote")
2. What we do — Airbnb & short-let specialist, Bristol
3. Why DizDaz — 6 competitive advantages
4. Pricing — clean table, 2025/26 rates
5. Testimonial/trust — YourApartment relationship (with permission)
6. Contact — phone, email, Instagram, simple enquiry CTA

**Deployment:** dizdaz-cleaning.vercel.app (free tier)

### 05 — Instagram Content Plan
30-day posting schedule for @dizdazcleaning. Built as a printable HTML calendar Jodie can follow without a social media manager.

**Content mix:**
- Before/after room photos (most engaging, drives follows)
- Team in action shots (builds trust)
- Tips for Airbnb hosts (positions DizDaz as expert)
- Service highlight posts (what DizDaz offers)
- Client shoutouts / testimonials
- Hiring posts (links to worker recruitment ads already built)

**Posting rhythm:** 4x per week (Mon, Wed, Fri, Sun)
**Hashtag set:** Bristol-specific + Airbnb/short-let niche

### 06 — 12-Month Growth Roadmap
Month-by-month plan to win 3–5 new contracts. Saved to Notion as a structured plan Jodie can track and update.

**Structure:**
- Month 1: Reprice YourApartment, launch website, activate Instagram
- Month 2–3: Outreach to 10 Bristol Airbnb management companies (service sheet + email)
- Month 4–6: Follow-up sequence, referral ask from YourApartment, target 1st new contract
- Month 6–9: Hire 1 additional cleaner, scale to 2nd and 3rd new contract
- Month 10–12: Review pricing again, target 4th–5th contract, consider branded uniform/vehicle wrap

**Target prospects (Bristol):**
- Pass the Keys Bristol
- Superhost Bristol operators (identifiable via Airbnb search)
- Local estate agents with short-let management arms
- Serviced apartment operators similar to YourApartment

---

## Technical Approach

All deliverables built as standalone HTML files — consistent with the DizDaz invoice app approach. No frameworks, no CMS. Files stored in `/Users/curtisbrooks/Developer/dizdaz-brand/assets/`. Website deployed to Vercel from the same repo. Strategy documents saved to Notion and committed to GitHub.

---

## Success Criteria

- [ ] Price increase letter sent to YourApartment within 1 week of launch
- [ ] New rates active within 30 days
- [ ] Website live at dizdaz-cleaning.vercel.app
- [ ] Service sheet ready to send to first prospect
- [ ] Instagram posting started (4x/week)
- [ ] First new client contract within 3 months
- [ ] 3 new contracts within 12 months
- [ ] Monthly revenue above £7,000 within 12 months

---

## Build Order

1. Price Increase Letter (fastest money — send to YourApartment immediately)
2. Service Sheet (needed for new client outreach)
3. Landing Page (needed as destination for outreach)
4. Brand Strategy Document (master reference)
5. Instagram Content Plan (activates social)
6. 12-Month Growth Roadmap (saves to Notion)
