# Privacy Policy

**MiseMap**
An application by Sayv Ilahsiav
[apps.sayvilahsiav.com](https://apps.sayvilahsiav.com)

**Last updated: April 2026**

---

## Overview

MiseMap is a private, internal kitchen management tool built for use within an organisation. It is not a public consumer product. This policy describes how data is handled within the application.

---

## 1. Who This Applies To

This policy applies to all authorised users of MiseMap within the organisation operated by Sayv Ilahsiav. Access to MiseMap is restricted to invited team members only.

---

## 2. What Data MiseMap Stores

MiseMap stores the following data in a shared Supabase database:

- **Raw material records** — ingredient names, categories, costs, unit conversions, and nutritional values that you enter
- **Intermediate recipes** — prep recipe names, ingredients, quantities, and yields that you enter
- **Menu item records** — menu item names, categories, recipes, and pricing configurations that you enter
- **Pricing settings** — global, category-level, and per-item pricing rules that you configure

MiseMap does **not** store:

- Personal information about users (no names, emails, or accounts)
- Payment or financial transaction data
- Customer data of any kind
- Device identifiers or usage analytics

---

## 3. AI Suggest Feature

When you use the **AI Suggest** feature, the ingredient or menu item name you type is sent to the **Anthropic Claude API** to generate suggested values. No other data from your account is sent.

Anthropic processes this data in accordance with their own privacy policy, available at [anthropic.com/privacy](https://anthropic.com/privacy). Anthropic states it does not use API request data to train its models by default.

---

## 4. Data Storage and Security

All application data is stored in a **Supabase** PostgreSQL database. Supabase is hosted on AWS infrastructure. Data is protected by:

- Row Level Security (RLS) policies enforced at the database level
- Encrypted connections (HTTPS/TLS) for all data in transit
- Supabase's encryption at rest

Supabase's privacy policy is available at [supabase.com/privacy](https://supabase.com/privacy).

---

## 5. Who Can Access Your Data

- **Your team** — all authorised users of MiseMap within your organisation share access to all data in the application. MiseMap is a collaborative tool with no per-user access controls at this time.
- **Sayv Ilahsiav** — as the developer and operator of this application, may access the database for maintenance, debugging, or support purposes.
- **Supabase** — as the infrastructure provider, has access to the underlying database in accordance with their terms.
- **No third parties** — data is not sold, shared, or disclosed to any other parties.

---

## 6. Data Retention

Data entered into MiseMap is retained indefinitely unless deleted by a team member within the application, or unless the Supabase project is deleted by the operator.

---

## 7. Your Rights

As this is an internal tool, users may:

- View all data stored in the application at any time
- Delete any records they have created
- Request deletion of all data by contacting the operator

---

## 8. Cookies and Tracking

MiseMap does not use cookies. MiseMap does not include any analytics, advertising trackers, or third-party tracking scripts.

---

## 9. Changes to This Policy

This policy may be updated from time to time. The "last updated" date at the top of this document will reflect any changes. Continued use of MiseMap after changes constitutes acceptance of the updated policy.

---

## 10. Contact

For any questions about this privacy policy or data handling, contact:

**Sayv Ilahsiav**
[apps.sayvilahsiav.com](https://apps.sayvilahsiav.com)
