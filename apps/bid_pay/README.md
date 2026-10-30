# BidPay Delivery

A peer-to-peer delivery marketplace prototype: customers name the price they want to pay for a
delivery, and drivers choose whether to accept it. No platform fee sits between them.

## Run it

Open `index.html` in any browser. No build step or server is needed.

## How it works

**Customers ("I'm ordering")**
- Post a delivery bid: item, pickup, drop-off, distance, and the price you'll pay.
- Change your bid or cancel while it's waiting for a driver.
- Review driver counter-offers and accept or decline them.
- Track status: waiting → driver on the way → picked up → delivered.

**Drivers ("I'm driving")**
- Browse open bids, filter by minimum pay, and sort by pay, $/mile, or newest.
- Accept a bid at the customer's price, or send a counter-offer.
- Mark jobs picked up and delivered, or release a job back to the pool.
- See open bids, active jobs, deliveries completed, and total earnings.

## Notes

This is a single-device prototype: data is stored in the browser's `localStorage`, so the
customer and driver views share state within one browser. A production version would need a
backend (accounts, real-time order sync, payments, maps/geolocation, ratings, and dispute handling).

---

© Pamela Logan 2020-2026: All rights reserved. Unauthorized use and/or duplication of this material
without express and written permission is strictly prohibited. No part of this publication may be
reproduced, distributed, or transmitted in any form or by any means without the prior written
permission of the copyright holder.
