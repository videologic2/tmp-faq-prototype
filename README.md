# tmp-faq-prototype

Interne FAQ-database prototype op basis van klantvragen over gezondheidsproducten.

## Starten

```bash
npm start
```

De app gebruikt een kleine Node.js-server, statische frontendbestanden en tijdelijke JSON-opslag in `data/faqs.json`.

## Railway

Railway gebruikt `railway.json` en start de app met:

```text
node faq-server.js
```

Let op: JSON-opslag is geschikt voor dit prototype, maar niet duurzaam bij herstarts of redeploys op Railway. Voor fase 2 is PostgreSQL een logische volgende stap.
