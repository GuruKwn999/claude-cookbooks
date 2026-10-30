# BidPay Delivery

A peer-to-peer delivery marketplace prototype: customers name the price they want to pay for a
delivery, and drivers choose whether to accept it. No platform fee sits between them.

## Business model: pay as you go, or join

Both customers and drivers choose how they pay BidPay:

| | Pay as you go (no membership) | Monthly member | Annual member |
|---|---|---|---|
| Customer | $2.49 service fee per delivery | $4.99 / month, no fees | $49.99 / year, no fees |
| Driver | 15% of each bid | $9.99 / month, keeps 100% | $99.99 / year, keeps 100% |

Non-members pay more over time. For example, a customer with 3 deliveries a month pays $7.47 in
fees versus $4.99 for a membership, and a driver completing 10 jobs at $12 pays $18.00 versus $9.99.
Fees are charged only on completed deliveries; cancelled orders are not charged.

Fees live in the `FEES` constant and plans in `PLANS`, both near the top of the script in
`index.html`. Each user's plan panel shows the fees they've paid so far to encourage upgrading.

## Run it

Open `index.html` in any browser. No build step or server is needed.

## How it works

**Customers ("I'm ordering")**
- Pay as you go, or join a membership to drop the service fee.
- See the total (bid + any fee) before posting.
- Post a delivery bid: item, pickup, drop-off, distance, and the price you'll pay.
- Change your bid or cancel while it's waiting for a driver.
- Review driver counter-offers and accept or decline them.
- Track status: waiting → driver on the way → picked up → delivered.

**Drivers ("I'm driving")**
- Pay as you go (15% fee per job), or join a membership to keep 100%.
- See what you'll keep on every job before accepting.
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
