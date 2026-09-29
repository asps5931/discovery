---
marp: true
theme: client-portal
paginate: true
size: 16:9
---

<!-- _class: lead -->
<!-- _backgroundImage: url('https://images.pexels.com/photos/13216333/pexels-photo-13216333.jpeg?auto=compress&cs=tinysrgb&w=1600') -->
<!-- _backgroundOpacity: 0.35 -->
<!-- _color: #ffffff -->

# Hydrogen Architecture

**Headless commerce migration for Commerce**

*Engineering Team · September 2026*

---

<!-- _class: lead -->

# The Problem

**Magento has served us well — but it's holding us back.**

---

# Why Move Off Magento?

| Pain Point | Today's Reality |
|------------|-----------------|
| Maintenance | **40+ hours/month** of patching |
| Performance | Lighthouse score of **62** |
| Flexibility | Monolith limits frontend innovation |
| Talent | Magento specialists are scarce |

> "Magento's customization ceiling keeps us from shipping the experiences our customers expect."

---

# Platform Comparison

| Dimension | Magento (Current) | Hydrogen (Proposed) |
|-----------|-------------------|---------------------|
| Frontend | PHP templates | **React + TypeScript** |
| Rendering | Server-side only | **Streaming SSR** |
| Styling | CSS overrides | **Tailwind CSS** |
| Build | Composer/Gulp | **Vite** |
| Deploy | Dedicated server | **Edge (Oxygen)** |
| Lighthouse | 62 | **95+** |

---

<!-- _class: lead -->

# The Solution

**Hydrogen — Shopify's React-based storefront framework.**

---

# Tech Stack Overview

![bg right:35% w:90%](https://images.pexels.com/photos/6956903/pexels-photo-6956903.jpeg?auto=compress&cs=tinysrgb&w=1200)

### Frontend
- **Hydrogen 2024.1** — React 18, streaming SSR
- **TypeScript** — strict mode
- **Tailwind CSS** — utility-first

### Backend
- **Shopify Storefront API** — GraphQL
- **Shopify Plus** — admin & inventory
- **Hosted Checkout** — PCI-compliant

---

# Data Flow

```text
Customer → Hydrogen (SSR) → Storefront API → Shopify Backend
                              ↓
                         Cart & Checkout
                     (hosted by Shopify, PCI-compliant)
```

The frontend talks to Shopify via **GraphQL**. Cart and checkout stay on Shopify's hosted infrastructure for **PCI compliance**, while Hydrogen handles all storefront rendering **at the edge**.

---

# Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP | **< 1.5s** | 3.2s |
| CLS | **< 0.1** | 0.25 |
| TTI | **< 2s** | 4.1s |
| Lighthouse | **95+** | 62 |

Every **100ms** of latency reduction typically yields a **1% increase** in conversions.

---

<!-- _class: lead -->

# The Plan

**A 13-week migration, broken into clear phases.**

---

# Project Timeline

1. **Discovery & Design** — 2 weeks
2. **Storefront Setup** — 1 week
3. **Component Library** — 3 weeks
4. **PLP + PDP Build** — 3 weeks
5. **Cart + Checkout** — 2 weeks
6. **QA + Launch** — 2 weeks

**Total: 13 weeks** from kickoff to launch.

---

# What Changes for Customers

![bg right:40% w:95%](https://images.pexels.com/photos/35560482/pexels-photo-35560482.jpeg?auto=compress&cs=tinysrgb&w=1200)

- **Faster pages** — 2x load-time improvement
- **Smoother navigation** — no full reloads
- **Better mobile** — responsive-first
- **Modern interactions** — cart drawer, instant filtering

---

# What Changes for the Team

- **Faster shipping** — component-based development
- **Better tooling** — hot reload, type safety
- **Lower maintenance** — Shopify handles backend & patches
- **Easier hiring** — React developers are plentiful

---

<!-- _class: lead -->
<!-- _backgroundColor: #1ba87c -->
<!-- _color: #ffffff -->

# Next Steps

**Approve the architecture and let's begin the discovery sprint.**

---

# Next Steps

1. **Approve** the technical architecture
2. **Begin discovery sprint** with stakeholders
3. **Set up Shopify Plus** sandbox environment
4. **Configure Storefront API** access
5. **Kick off** the design system

Let's build something great together.
