# NYCU AI Office Website

Official website for the National Yang Ming Chiao Tung University (NYCU) Office of AI Affairs.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Package Manager**: Bun
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Rich Text Editor**: Tiptap

## Getting Started

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Commands

```bash
bun dev      # Start development server
bun build    # Build for production
bun start    # Start production server
bun lint     # Run ESLint
```

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

## Page Structure

### Public Pages

| Route                               | Description                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `/`                                 | Home (carousel, introduction, organization, announcements, events)         |
| `/introduction`                     | Office introduction                                                        |
| `/organization`                     | Organization member listing                                                |
| `/announcement`                     | Global announcements list                                                  |
| `/announcement/[id]`                | Announcement detail                                                        |
| `/result`                           | Global results list                                                        |
| `/result/[id]`                      | Result detail                                                              |
| `/recruitment`                      | Global recruitment listing                                                 |
| `/profile/[id]`                     | Author profile page                                                        |
| `/team/[id]`                        | Team detail page                                                           |
| `/privacy`                          | Privacy policy                                                             |
| `/events`                           | Events listing                                                             |
| `/events/[slug]`                    | Event detail page (announcements / results / recruitment tabs via `?tab=`) |
| `/events/[slug]/announcements/[id]` | Event announcement detail                                                  |
| `/events/[slug]/results/[id]`       | Event result detail                                                        |

### Content Management (Login Required)

| Route                                    | Description              |
| ---------------------------------------- | ------------------------ |
| `/announcement/[id]/edit`                | Edit announcement        |
| `/result/[id]/edit`                      | Edit result              |
| `/recruitment/[id]/edit`                 | Edit recruitment         |
| `/introduction/edit`                     | Edit office introduction |
| `/events/[slug]/edit`                    | Edit event metadata      |
| `/events/[slug]/announcements/[id]/edit` | Edit event announcement  |
| `/events/[slug]/results/[id]/edit`       | Edit event result        |
| `/events/[slug]/recruitment/[id]/edit`   | Edit event recruitment   |

### Account Pages (Login Required)

| Route                 | Description                                   |
| --------------------- | --------------------------------------------- |
| `/account`            | Profile, team membership, pending invitations |
| `/account/teams`      | Team list / create team                       |
| `/account/teams/[id]` | Team detail + invite members                  |

### Admin Only

| Route                     | Description              |
| ------------------------- | ------------------------ |
| `/settings`               | System settings          |
| `/settings/users`         | User management          |
| `/organization/[id]/edit` | Edit organization member |
| `/carousel/[id]/edit`     | Edit carousel slide      |
| `/contacts/[id]/edit`     | Edit contact info        |
| `/privacy/edit`           | Edit privacy policy      |

## Data Model

- **Announcement**: Global (`event_id IS NULL`) or event-scoped (`event_id IS NOT NULL`). Event-scoped announcements are excluded from the global `/announcement` page.
- **Result**: `type: personal | team`, optionally linked to an event via `event_id`.
- **Recruitment** (DB table: `competitions`): Job postings, optionally linked to an event. Event-scoped entries are excluded from the global `/recruitment` page.
- **Event**: Container with `slug`, `pinned`, and `sort_order`. Pinned events appear directly in the header navigation.

## Supabase Storage Setup (One-time)

All images are stored in the `announcement-images` bucket (public).

1. Supabase Dashboard → **Storage** → **New bucket**
   - Name: `announcement-images`
   - Public bucket: **ON**
2. Run `supabase/storage-policies.sql` in the **SQL Editor**

Image path prefixes by content type:

- Announcement inline images: root
- Result cover images: `results/`
- Recruitment images: `recruitment/`
- Organization member photos: `organization/`
- Event cover images: `events/`
