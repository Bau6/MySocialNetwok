docker-compose down 
остановить все


Пересобрать бэкенд
cd backend
./mvnw clean package -DskipTests


Запустить всё заново
docker-compose up -d --build