web: nginx -c $PWD/nginx.conf -e $PWD/error.log -g 'daemon off;'
server: python3 -m http.server $PORT
term: ttyd -p 7681 docker run -it --rm sendit
