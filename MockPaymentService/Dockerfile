FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY Api/package.json Api/
COPY Web/package.json Web/
COPY MockPaymentService/package.json MockPaymentService/
RUN npm ci -w mock-payment-service --omit=dev && npm cache clean --force
COPY MockPaymentService/src MockPaymentService/src
ENV NODE_ENV=production
WORKDIR /app/MockPaymentService
EXPOSE 3100
CMD ["node", "src/main.ts"]
