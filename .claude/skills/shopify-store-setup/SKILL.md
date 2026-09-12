---
name: shopify-store-setup
description: "Sets up and optimizes Shopify storefronts, including theme structure, collections, pages, menus, navigation, product setup, payment configuration, and launch preparation. Use when creating or improving a Shopify store."
allowed-tools: Read Write Glob
metadata:
  author: Ahmad Digital Builder
  version: "1.0"
---

# Shopify Store Setup

## When to Use This Skill

Use this skill when you need to:
- Build a Shopify store from scratch
- Organize collections and product structure
- Set up navigation and storefront pages
- Prepare a store for launch
- Improve theme structure and store usability

## Core Principle

A SHOPIFY STORE SHOULD FEEL SIMPLE TO NAVIGATE, EASY TO TRUST, AND CLEAR ENOUGH FOR A CUSTOMER TO BUY IN LESS THAN A FEW CLICKS.

## Practical Experience Layer

- Product structure matters as much as design.
- Good navigation reduces friction.
- Setup should support both customer clarity and operational simplicity.

## Phase 1: Store Foundation

### Required Inputs

| Input | What to Ask | Default |
|-------|------------|---------|
| Brand name | "What is the store name?" | Unknown |
| Product catalog | "What products will be sold?" | Small catalog |
| Shipping model | "Domestic, international, or local delivery?" | Domestic |
| Payment settings | "What payment methods are available?" | Shopify default |
| Store type | "Consumable, apparel, beauty, accessories, digital?" | General ecommerce |
| Goal | "What is the main goal: sales, leads, subscriptions?" | Sales |

GATE: Confirm the catalog and sales flow before building the storefront.

## Phase 2: Store Structure

### Recommended Navigation

```
## Store Navigation

- Home
- Shop
- New Arrivals
- Best Sellers
- Collections
- About
- Reviews
- FAQ
- Contact
```

### Collection Logic

- Group by product type, customer need, or use case.
- Avoid creating overly deep or confusing structures.
- Use simple collection names with clear intent.

## Phase 3: Theme and Page Setup

### Essential Pages

```
## Pages to Create

- Home
- Shop All
- Product pages
- Collection pages
- About Us
- Contact
- Shipping & Returns
- FAQ
- Privacy Policy
```

### Launch Settings Checklist

- Product images uploaded
- SEO titles and descriptions added
- Navigation menus set
- Product variants configured
- Policies and shipping info updated
- Payment gateways tested
- Mobile checkout reviewed

## Phase 4: Store QA

### Pre-Launch QA

- Check mobile experience
- Confirm product prices and discounts
- Review shipping thresholds
- Test cart and checkout flow
- Verify trust badges and contact info
- Review 404 pages and broken links

### Store Performance Signals

- Search and navigation clarity
- Conversion rate by collection
- Cart abandonment rate
- Product page engagement
- Repeat customer rate

## Anti-Patterns

- Too many menu items and collections
- Generic category names without customer intent
- Unclear shipping or return policies
- Weak product organization
- No clear homepage conversion path

## Recovery

- If customers cannot find products: simplify navigation and improve collection structure.
- If conversion is weak: reduce visual clutter and sharpen homepage CTA flow.
- If the store feels untrustworthy: add proof, policies, and clearer support access.
