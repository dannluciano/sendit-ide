# SendIT IDE

A SendIT editor and shell


## Deployment

To run this project exec:

```bash
$ docker compose up --build -d && docker compose logs -f
```

```bash
socat -d -v -d TCP-L:2375,fork UNIX:/var/run/docker.sock

curl --unix-socket /var/run/docker.sock -H "Content-Type: application/json" http://localhost/info
curl --unix-socket /run/docker.sock -H "Content-Type: application/json" http://localhost/info
curl "Content-Type: application/json" "http://localhost:2375/info"

```

Visit ```http://localhost```


## Authors

- [@dannluciano](https://www.github.com/dannluciano)
