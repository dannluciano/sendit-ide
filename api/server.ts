import Docker from 'dockerode'
import { pathToRegexp } from 'path-to-regexp'

const clients = {}

async function createContainer() {
    try {
        console.info("==> Connecting to Docker Daemon")
        const docker = new Docker({ protocol: 'http', host: 'host.docker.internal', port: 2375 })
        // const docker = new Docker({ socketPath: '/var/run/docker.sock' })

        console.info("==> Creating container")
        const container = await docker.createContainer({
            Image: 'sendit-ide-vm',
            AttachStdin: false,
            AttachStdout: false,
            AttachStderr: false,
            Tty: true,
            Cmd: ['/bin/bash',],
            OpenStdin: true,
            StdinOnce: false
        })

        console.info("==> Starting container")
        await container.start()

        const obj = { id: container.id }
        return Response.json(obj)
    } catch (error) {
        console.error("Error!", error)
        return Response.json(
            {
                msg: "Error! Cannot create container"
            }, {
            status: 500
        }
        )
    }
}

function GetIndex() {
    return new Response(
        Bun.file("./index.html"),
        {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
                'Access-Control-Expose-Headers': 'Content-Length,Content-Range'
            }
        }
    );
}

function GetStaticFiles(url: URL) {
    const path = '.' + url.pathname
    const file = Bun.file(path)
    if (file.size > 0) {
        return new Response(file);
    } else {
        return new Response(
            "File not found",
            {
                status: 404
            }
        );
    }
}

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/") {
            return GetIndex()
        }

        if (url.pathname.startsWith("/assets/")) {
            return GetStaticFiles(url)
        }

        if (url.pathname === "/create") {
            return await createContainer()
        }

        return new Response("Bun!")
     }
    //, websocket: {
    //     message(ws, message) { 
    //         console.log(`==> Browser to Server MSG: ${message}`)
    //     },
    //     open(ws) {
    //         console.log(`==> Browser to Server MSG: ${ws}`)
    //     },
    //     close(ws, code, message) { }, // a socket is closed
    //     drain(ws) { }, // the socket is ready to receive more data
    // },
});

console.log(`Listening on http://localhost:${server.port} ...`);