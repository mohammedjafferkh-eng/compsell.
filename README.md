# CompSell Electronics Hub

Recommended product direction

Brand: compsell

Tagline: Buy. Sell. Reuse Electronics.

Visual identity

 Primary: Electric Blue #2563EB

 Background: near-white #F8FAFC

 Dark text: #0F172A

 Accent: subtle PCB/circuit traces

 Rounded cards, compact mobile UI

 Small electronics icons for categories

 Avoid excessive gradients or "AI startup" styling

Main pages

Home / Browse

 Search: Search ESP32, sensors, motors...

 Nearby listings first

 Category chips

 Latest listings

 "Sell a Component" CTA

Search / Explore

 Search

 Category

 Condition

 ₹ price range

 City/campus

 Sort: Nearby / Newest / Price low-high

Listing Details

 Up to 5 photos

₹250

ESP32 DevKit V1

 Condition + quantity

 Description

 Pickup location

 Seller profile/rating

Contact Seller

Chat

Create Listing

 Photos

 Title

 Category

 Condition

 Price

 Quantity

 Description

 City/campus

 Publish

My Listings

 Active

 Sold

 Edit

 Mark as Sold

 Delete

Profile

 Profile photo/name

 Campus/city

 Rating

 Active listings

 Reviews

Chat

 Buyer ↔ seller conversation

 Listing attached to conversation

 WhatsApp fallback

Supabase structure

I'd use these core tables:

profiles

 ├─ id

 ├─ name

 ├─ avatar_url

 ├─ city

 ├─ campus

 ├─ rating

 └─ created_at

listings

 ├─ id

 ├─ seller_id

 ├─ title

 ├─ category

 ├─ condition

 ├─ price

 ├─ quantity

 ├─ description

 ├─ city

 ├─ campus

 ├─ status

 └─ created_at

listing_images

 ├─ id

 ├─ listing_id

 ├─ image_url

 └─ sort_order

conversations

 ├─ id

 ├─ listing_id

 ├─ buyer_id

 ├─ seller_id

 └─ created_at

messages

 ├─ id

 ├─ conversation_id

 ├─ sender_id

 ├─ message

 └─ created_at

reviews

 ├─ id

 ├─ reviewer_id

 ├─ reviewed_user_id

 ├─ listing_id

 ├─ rating

 ├─ comment

 └─ created_at

Supabase Storage would contain:

listing-images/

    listing-id/

        image-1

        image-2

        ...

avatars/

    user-id

Important marketplace logic

A listing should have:

ACTIVE

SOLD

And the quantity should decrease when a seller sells part of their stock.

For example:

ESP32 DevKit — ₹180 each — Quantity: 5

Buyer contacts seller → they arrange pickup/payment → seller changes quantity to 4.

When quantity reaches zero, automatically mark it SOLD.

Homepage concept

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://compsell.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/275d866f-ac68-4e49-a651-45edaec21b8f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
