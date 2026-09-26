export NODE_ENV=development
export PORT=3010
export DATABASE_URL="postgresql://prospector:prospector_db_pass@localhost:5432/prospectordb?schema=public"
npx dotenv-cli -e .env -- tsx server.ts > e2e_server.log 2>&1 &
sleep 20
