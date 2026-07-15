# AppTrack — деплой на Railway (один сервіс)

Один Node.js-сервіс віддає і дашборд (`index.html`), і API тегів. Теги зберігаються у файлі `tags.json` на Railway volume.

## API

| Метод | Шлях | Доступ | Опис |
|---|---|---|---|
| GET | `/` | публічний | сам дашборд (index.html) |
| GET | `/api/tags` | публічний | `{tags:[{id,name,color,desc}], assignments:{rowKey:[tagId]}}` |
| POST | `/api/tags` | заголовок `X-Admin-Password` | повний перезапис того ж об'єкта |
| GET | `/api/config` | публічний | `{u1,u2}` — CSV-лінки Google Sheets |
| POST | `/api/config` | заголовок `X-Admin-Password` | зберегти CSV-лінки |

## Деплой (1 раз)

1. Railway → **New Project → Deploy from GitHub repo** → вибери цей репозиторій (root directory чіпати не треба — `package.json` лежить у корені, старт: `node server/index.js`).
2. **Volume**: правий клік на сервіс → **Attach Volume** → mount path, наприклад `/data`. Railway сам додасть змінну `RAILWAY_VOLUME_MOUNT_PATH` — код її підхопить і покладе туди `tags.json`.
3. **Пароль**: за замовчуванням `AdminM3` (зашитий і у фронті, і в сервері) — нічого налаштовувати не треба. Щоб змінити на сервері: Variables → `ADMIN_PASSWORD` (і тоді ж поміняй `ADM_PW` в index.html).
4. **Domain**: Settings → Networking → Generate Domain → відкривай дашборд за цим URL.

Фронтенд звертається до API за відносним шляхом `/api/tags`, тому жодних URL налаштовувати не треба. Якщо відкрити `index.html` без бекенду (локально) — дашборд працює як звичайно, просто без синхронізації тегів.

## Перевірка

```bash
curl https://<your-app>.up.railway.app/api/tags
# → {"tags":[],"assignments":{}}

curl -X POST https://<your-app>.up.railway.app/api/tags \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: <пароль>" \
  -d '{"tags":[{"id":"t1","name":"test","color":"#22c55e"}],"assignments":{}}'
# → {"ok":true}
```

## Локальний запуск

```bash
npm install
ADMIN_PASSWORD=test1234 npm start
# → http://localhost:3000
```
