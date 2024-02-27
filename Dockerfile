FROM nginx

COPY index.html /usr/share/nginx/html
COPY assets     /usr/share/nginx/html/assets