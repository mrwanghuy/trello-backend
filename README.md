# TrelloLite Backend

NestJS 10 + Prisma + PostgreSQL backend cho TrelloLite.

## Yeu cau

- Node.js 20+
- PostgreSQL va Redis chay tu sibling repo `trello-infra`:

```bash
cd ../trello-infra && make up
```

## Khoi dong

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

## Kiem tra

- Health check: `GET http://localhost:3001/api/v1/health`
- Swagger UI: `http://localhost:3001/docs`

## Tai khoan demo

- Email: `demo@trellolite.dev`
- Password: `demo1234`
