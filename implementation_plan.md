# Implementation Plan: MiseMap Enhancements & Bug Fixes

This plan outlines the architecture, database migrations, and frontend updates required to fix the organization creation bug and implement the requested dashboard and mobile improvements.

## User Requirements (Prompt)
1. Categories and Sub-Categories will be dropdown. You can add new values from the dropdown itself or we can have a tab for Categories and Sub-categories?
2. Personalize Dashboard based on org. Org profile in settings to allow a logo.
3. Dashboard cards should be draggable to reorder. Option to reset to default also available.
4. Update overall theme and logo of the MiseMap app. Will provide with a brand doc.
5. Sort and Filter options for all lists.
6. Add profile icon on the top right corner for mobile screens, to allow sign out there and other info.
7. Mobile version does not show sign out button.
8. Font sizes and weights need to be standardized.
9. In Menu Item list, highlight food cost and dine in price instead of delivery price.
10. Header needs to be sticky in mobile version.
11. The 4 basic stats on the dashboard can be a 2x2 grid on mobile screens.
12. Create Org is not working. Fix this first.

---

## User Review Required

> [!IMPORTANT]
> **Database Migrations (Supabase RLS & Schema Setup)**
> Since "Create Org" is currently failing, it is highly likely due to missing or overly restrictive Row Level Security (RLS) policies on the `organizations` and `profiles` tables. 
> Below is the SQL script to run in your **Supabase Dashboard → SQL Editor** to establish proper tables and RLS policies. Please run this query to ensure the backend supports the frontend operations.

### Proposed SQL Schema Setup & RLS Policies
```sql
-- 1. Create Organizations Table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  logo_url text, -- For personalization (personal logo)
  created_at timestamptz default now()
);

-- 2. Create Profiles Table (if not exists / upgrade)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  role text default 'member',
  email text,
  updated_at timestamptz default now()
);

-- 3. Create Org Join Requests Table
create table if not exists org_join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz default now(),
  constraint unique_user_org_request unique (user_id, org_id)
);

-- 4. Create Org Invitations Table
create table if not exists org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  created_at timestamptz default now(),
  constraint unique_org_email_invite unique (org_id, email)
);

-- 5. Enable Row Level Security (RLS)
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table org_join_requests enable row level security;
alter table org_invitations enable row level security;

-- 6. Row Level Security Policies

-- Organizations Policies
create policy "Allow authenticated users to insert organizations" on organizations
  for insert with check (auth.role() = 'authenticated');

create policy "Allow members/owner to read organization" on organizations
  for select using (
    id = (select org_id from profiles where id = auth.uid()) OR
    owner_id = auth.uid() OR
    id in (select org_id from org_join_requests where user_id = auth.uid()) OR
    id in (select org_id from org_invitations where email = (select email from profiles where id = auth.uid()))
  );

create policy "Allow owners to update organization" on organizations
  for update using (
    owner_id = auth.uid() OR
    (select role from profiles where id = auth.uid()) = 'owner'
  );

-- Profiles Policies
create policy "Allow users to read profiles in their org" on profiles
  for select using (
    org_id = (select org_id from profiles where id = auth.uid()) OR
    id = auth.uid()
  );

-- Allow users to insert their own profile
create policy "Allow users to insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Allow users/owners to update profiles" on profiles
  for update using (
    auth.uid() = id OR
    (select role from profiles where id = auth.uid()) = 'owner'
  );

-- Join Requests Policies
create policy "Allow users to manage their own requests" on org_join_requests
  for all using (user_id = auth.uid());

create policy "Allow owners to view/manage requests for their org" on org_join_requests
  for all using (
    (select role from profiles where id = auth.uid() and org_id = org_join_requests.org_id) = 'owner'
  );

-- Invitations Policies
create policy "Allow users to view invitations sent to them" on org_invitations
  for select using (email = (select email from profiles where id = auth.uid()));

create policy "Allow owners to manage invitations for their org" on org_invitations
  for all using (
    (select role from profiles where id = auth.uid() and org_id = org_invitations.org_id) = 'owner'
  );
```

---

## Open Questions
- **Draggable Cards Placement**: Do you prefer to store the layout order in the browser's `localStorage` (per-device) or sync it to the cloud database (`kv_store`) so it's consistent for the user across all devices? (Recommended: `localStorage` first for instant load, falling back to sync).

---

## Proposed Changes

### Component 1: Organization Creation & Error Handling
We will update `createOrg` to propagate errors properly so that user feedback is immediately clear.

#### [MODIFY] [AuthContext.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/context/AuthContext.jsx)
- Update `createOrg`, `joinOrg`, and `cancelJoinRequest` to re-throw caught errors after showing the toast, enabling calling components (like `AuthPortal.jsx`) to capture the error in their local component states and render inline alert boxes.
- Verify the `shouldSeed` sample data payload scopes and error boundaries.

---

### Component 2: Categories & Sub-categories Dropdown Manager
We will implement an interactive dropdown that supports both selecting existing values and adding new values inline, as well as a tab for managing them.

#### [MODIFY] [modals.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/components/modals.jsx) & [pages.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/components/pages.jsx)
- Update ingredient and menu item modals to display a custom search/select dropdown for Category and Sub-category.
- Add an inline `+ Add new...` entry inside the dropdown that opens a text input to instantly append a new category.
- Introduce a dedicated "Categories" tab in the **Settings** page that lists all categories and sub-categories in use, allowing renaming or deletion of unused ones.

---

### Component 3: Personalization & Dashboard Reordering
We will implement dashboard personalization and interactive layout adjustments.

#### [MODIFY] [pages.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/components/pages.jsx)
- **Personalization**: Add a Logo URL field (and text input/preview) in the Organization Profile section of the Settings page. This logo will display on the sidebar/header and the main Dashboard.
- **Draggable Cards**: Implement HTML5 Drag & Drop (`draggable="true"`, `onDragStart`, `onDragOver`, `onDrop`) for the dashboard stats and summary cards.
- Add a "Reset to Default Layout" button to restore the default grid order.
- Standardize the 4 basic stats to render in a 2x2 grid on mobile screens (`@media (max-width: 768px)`).

---

### Component 4: Sorting, Filtering, and Table Display Improvements
We will refine tables and data presentation for better usability.

#### [MODIFY] [pages.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/components/pages.jsx)
- Add Sort buttons (A-Z, Z-A, price ascending/descending) and Filter drop-downs (by category, sub-category, alert status) above all data lists (Ingredients, Intermediates, Menu Items).
- In the Menu Item list/cards, highlight **food cost** and **dine-in price** (using bold formatting or warning badges for margin alerts) instead of delivery price.

---

### Component 5: Mobile Navigation & Sticky Header
We will polish mobile layouts to match high-end design aesthetics.

#### [MODIFY] [App.jsx](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/App.jsx) & [index.css](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/index.css)
- Implement a sticky mobile header (`position: sticky; top: 0; z-index: 100`) with glassmorphism blending.
- Remove the raw/exposed sign-out button from mobile page body content.
- Add a beautiful profile icon/avatar in the top-right corner of the mobile header. Tapping it opens a clean slide-over modal or dropdown containing:
  - Current user email & role
  - Connected Organization Name & Organization ID
  - A prominent "Sign Out" button.

#### [MODIFY] [index.css](file:///c:/Users/VaishaliVyas/OneDrive%20-%20Viva%20Foods/Built%20Tools/misemap/src/index.css)
- Standardize font sizes (`12px`, `14px`, `16px`, `20px`, `24px`) and weights (`400`, `500`, `600`, `700`, `800`) across all elements using a CSS utility scale.

---

## Verification Plan

### Automated Checks
- Verify code imports and components load without build failures.

### Manual Verification
1. **Org Creation**: Register a new user, fill in organization name, and verify the organization is successfully created and profile is updated to "owner".
2. **Personalization**: Upload/link a logo in Settings, confirm it updates the sidebar and dashboard.
3. **Draggable Cards**: Drag and drop cards on the dashboard, refresh the page, and check if order is retained. Click "Reset Layout" and verify it returns to default.
4. **Mobile Layout**: Emulate a mobile screen, verify header sticks to the top, check 2x2 stats layout, tap top-right profile icon, and verify sign-out works from there.
