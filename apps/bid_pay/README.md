# BidPay Delivery

A peer-to-peer delivery marketplace prototype: customers name the price they want to pay for a
delivery, and drivers choose whether to accept it. No platform fee sits between them.

## Business model: memberships

BidPay earns money only from memberships paid by **both** sides. It never takes a cut of a
delivery, so 100% of every bid goes to the driver.

| Member   | Monthly | Annual  | Unlocks                                       |
|----------|---------|---------|-----------------------------------------------|
| Customer | $4.99   | $49.99  | Posting delivery bids, accepting counter-offers |
| Driver   | $9.99   | $99.99  | Accepting jobs, sending counter-offers        |

Prices and perks live in the `PLANS` constant at the top of the script in `index.html`.
Members can turn auto-renew off (access continues until expiry) or add another term.

## Run it

Open `index.html` in any browser. No build step or server is needed.

## How it works

**Customers ("I'm ordering")**
- Join a customer membership (required to post bids).
- Post a delivery bid: item, pickup, drop-off, distance, and the price you'll pay.
- Change your bid or cancel while it's waiting for a driver.
- Review driver counter-offers and accept or decline them.
- Track status: waiting → driver on the way → picked up → delivered.

**Drivers ("I'm driving")**
- Join a driver membership (required to accept jobs or counter-offer).
- Browse open bids, filter by minimum pay, and sort by pay, $/mile, or newest.
- Accept a bid at the customer's price, or send a counter-offer.
- Mark jobs picked up and delivered, or release a job back to the pool.
- See open bids, active jobs, deliveries completed, and total earnings.

## Notes

This is a single-device prototype: data is stored in the browser's `localStorage`, so the
customer and driver views share state within one browser. A production version would need a
backend (accounts, real-time order sync, recurring membership billing through a payment
processor such as Stripe, maps/geolocation, ratings, and dispute handling).

---

© Pamela Logan 2020-2026: All rights reserved. Unauthorized use and/or duplication of this material
without express and written permission is strictly prohibited. No part of this publication may be
reproduced, distributed, or transmitted in any form or by any means without the prior written
permission of the copyright holder.
