# Event Ticket Booking


## Features

- Sign up / log in with email (Keycloak, JWT)
- Roles: `CUSTOMER` books and cancels tickets, `ADMIN` creates, updates, deletes and lists events
- Customers can see their own bookings
- Unpaid bookings are cancelled after 30 minutes and the tickets go back to inventory; payment status comes from the mock payment REST service

## Stack

- **Api** — NestJS, TypeORM, MySQL
- **Web** — React + Vite
- **MockPaymentService** — Express mock payment REST service
- **IDProvider** — Keycloak
- **MySQL** — MySQL 8.4

## Requirements

- Node.js 24
- Docker

## Start

```sh
cp IDProvider/.env.example IDProvider/.env
npm install
npm start
```

Open http://localhost:3000. Swagger is at http://localhost:3000/api/docs.
**Login user defined in IDProvider/.env**

## Database

- Config: `MySQL/docker-compose.yml` — database `event_ticket_booking`, user `app` / `app`, port `3308`
- Api connection settings: `Api/.env.example` (local) and `Api/.env.docker` (docker)
- Tables are created by TypeORM on startup
- SQL dump: `MySQL/dump.sql`

**The dump file is not needed to run the project. The project is designed code first, so TypeORM creates the schema from the entities on startup. The dump is included only because the challenge asks for it.**

## Keycloak

- Config: `IDProvider/docker-compose.yml`, runs at http://localhost:8180
- Realm `event-ticket-booking` is imported from `IDProvider/realms/event-ticket-booking-realm.json`
- Admin user and password come from `IDProvider/.env` (`REALM_ADMIN_EMAIL`, `REALM_ADMIN_PASSWORD`); this user has the `ADMIN` role
- New users register from the login page and get the `CUSTOMER` role


### Development

```sh
cp IDProvider/.env.example IDProvider/.env
cp Api/.env.example Api/.env
cp Web/.env.example Web/.env
npm install
docker compose up -d --wait
npm run dev
```

Web runs at http://localhost:5173, Api at http://localhost:3000, payment service at http://localhost:3100.

### Tests

```sh
npm run test:prepare
```

