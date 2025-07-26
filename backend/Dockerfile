FROM python:3.9-slim

WORKDIR /app


RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*


RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs


COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY package*.json ./
RUN npm install --production


COPY . .


RUN mkdir -p temp


EXPOSE 8080


CMD ["npm", "start"]