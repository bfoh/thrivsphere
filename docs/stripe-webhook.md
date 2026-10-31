# Stripe webhook

Endpoint: `POST https://thrivsphere.org/api/webhooks/stripe`

Card payments are taken on Stripe's hosted Checkout page. This endpoint is
what turns a payment into sessions the client can book, and takes sessions
back when a payment is refunded or disputed. It refuses any request that is
not signed with `STRIPE_WEBHOOK_SECRET`.

## Events

The endpoint must send exactly these events. Any it is not sent are simply
never acted on.

| Event | What the website does |
|---|---|
| `checkout.session.completed` | Credits the sessions bought and emails the receipt |
| `checkout.session.async_payment_succeeded` | The same, for a payment method that confirms later |
| `checkout.session.async_payment_failed` | Marks the order failed; nothing was credited |
| `checkout.session.expired` | Marks an abandoned order cancelled |
| `charge.refunded` | Removes the sessions the refund paid back, and emails the owner |
| `charge.dispute.created` | Puts the sessions on hold, and emails the owner the date evidence is due |
| `charge.dispute.closed` | Won: the sessions come back. Lost: they stay removed |

Owner emails go to `ENQUIRY_TO_EMAIL`. Like the diary notices they carry no
client details, only a link to the client's record.

## Refunds

Refunds are made in the Stripe Dashboard. The client keeps the sessions that
the money ThriveSphere keeps still pays for, to the nearest session, with each
session worth an equal share of the price:

| Refund | Client keeps |
|---|---|
| The whole payment | Nothing |
| £112.50 of a £150 four-session package | 1 session |
| £70 of a £150 four-session package (£40 kept for each of 2 used) | 2 sessions |
| A small goodwill amount, such as £10 | All of them |

Sessions already booked against credit that a refund removed stay in the
diary. The owner's email says how many there are, so they can be cancelled
under **Appointments** or paid for another way.

## Setting it up

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**, once in the
   sandbox (for testing) and once in live mode.
2. URL: `https://thrivsphere.org/api/webhooks/stripe`
3. Select the seven events above.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel, for the
   matching environment, and redeploy.

An endpoint added before these refund and dispute events existed in the code
needs the five new events adding to it: **Developers → Webhooks → the
endpoint → Update details**.
