/* eslint-env node */
import Docker from 'dockerode'

import {
    mkdtemp
} from 'node:fs/promises';
import {
    join
} from 'node:path';
import {
    tmpdir
} from 'node:os';

import { renderFile } from 'ejs'


// const dockerHost = 'localhost'
const dockerHost = 'host.docker.internal'

const wsConnections = {}

async function createContainer() {
    try {
        console.info("==> Creating Temp Folder")
        const temp_dir_path = await mkdtemp(join(tmpdir(), 'ide-vm-home-'));
        console.info(`==> Created Temp Folder: ${temp_dir_path}`)

        console.info("==> Connecting to Docker Daemon")
        const docker = new Docker({
            protocol: 'http',
            host: dockerHost,
            port: 2375,
            timeout: 10000
        })
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
            StdinOnce: false,
            "WorkingDir": "/root",
            "StopTimeout": 1,
            'Volumes': {
                '/root': {}
            },
            'HostConfig': {
                'Binds': [`${temp_dir_path}:/root`],
                'AutoRemove': true,
            },
            "Labels": {
                "com.docker.compose.service": "vm",
            }
        })

        console.info("==> Starting container")
        await container.start()

        console.info("==> Waiting for container to start")

        // const info = await container.inspect()
        // console.info("==>", info)

        const obj = {
            "container-id": container.id,
            "temp-dir-path": temp_dir_path
        }
        return Response.json(obj)

    } catch (error) {
        console.error("Error!", error)
        return Response.json({
            msg: "Error! Cannot create container"
        }, {
            status: 500
        })
    }
}

async function stopContainer(containerId) {
    try {
        console.info("==> Connecting to Docker Daemon")
        const docker = new Docker({
            protocol: 'http',
            host: dockerHost,
            port: 2375,
            timeout: 10000
        })
        // const docker = new Docker({ socketPath: '/var/run/docker.sock' })

        const container = await docker.getContainer(containerId)
        await container.stop()

        const obj = {
            "msg": "OK",
            "container-id": container.id,
        }
        return Response.json(obj)

    } catch (error) {
        console.error("Error!", error)
        return Response.json({
            msg: "Error! Cannot stop container",
            "container-id": containerId,
        }, {
            status: 500
        })
    }
}

function GetIndex() {
    return new Response(
        Bun.file("./index.html"), {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
            'Access-Control-Expose-Headers': 'Content-Length,Content-Range'
        }
    }
    );
}

function GetPythonRuntime() {
    return new Response(
        Bun.file("./python.html")
    )
}

function GetStaticFiles(url: URL) {
    const path = '.' + url.pathname
    const file = Bun.file(path)
    if (file.size > 0) {
        return new Response(file);
    } else {
        return new Response(
            "File not found", {
            status: 404
        }
        );
    }
}

async function runSource(req: Request) {
    try {
        const body = await req.json()

        const containerId = body.containerId

        console.info("==> Connecting to Docker Daemon")
        const docker = new Docker({
            protocol: 'http',
            host: dockerHost,
            port: 2375,
            timeout: 1000
        })

        const container = docker.getContainer(containerId)

        const exec = await container.exec({
            Cmd: ['echo', 'print(\"hello\")', '>', '/root/main.py']
        })
        await exec.start()


        return Response.json({
            msg: "OK",
            code: body.code,
            containerId: containerId
        })
    } catch (err) {
        console.error(err)
        return Response.json({
            msg: "No body"
        }, {
            status: 400
        })
    }
}

async function createFile(temp_dir_path, filename) {
    try {
        const new_file_path = `${temp_dir_path}/${filename}`
        await Bun.write(new_file_path, '');
        return Response.json({ msg: 'OK', path: new_file_path })
    } catch (error) {
        console.error(error)
        return Response.json({ msg: error })
    }
}


// async function handle_signals() {
//     console.log("Ctrl-C was pressed");

//     const opts = {
//         "filters": '{"label": ["com.docker.compose.service","vm"]}'
//     };

//     try {
//         console.info("==> Connecting to Docker Daemon")

//         const docker = new Docker({
//             protocol: 'http',
//             host: dockerHost,
//             port: 2375,
//             timeout: 1000
//         })
//         const containers = await docker.listContainers({
//             opts
//         })
//         console.info(containers.length)
//         containers.forEach(async container => {
//             // await docker.getContainer(container.Id).remove({force: true})
//             // await container.stop()
//             await container.kill()
//         });
//     } catch (error) {
//         console.error(error)
//         process.exit(-1);
//     }

//     process.exit(0);
// }

// process.on("SIGINT", handle_signals);
// process.on("SIGTERM", handle_signals);
// process.on("SIGKILL", handle_signals);

const server = Bun.serve({
    port: process.env["PORT"] || 8000,
    async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/") {
            return GetIndex()
        }

        if (url.pathname === "/python") {
            return GetPythonRuntime()
        }

        if (url.pathname.startsWith("/assets/")) {
            return GetStaticFiles(url)
        }

        if (req.method === "POST" && url.pathname === "/create") {
            return await createContainer()
        }

        if (req.method === "POST" && url.pathname === "/stop") {
            const data = await req.json()
            const containerId = data['container-id']
            return await stopContainer(containerId)
        }

        if (req.method === "POST" && url.pathname === "/fs/file/create") {
            const data = await req.json()
            const temp_dir_path = data['temp-dir-path']
            const filename = data['filename']
            return await createFile(temp_dir_path, filename)
        }

        if (req.method === "POST" && url.pathname === "/run") {
            return await runSource(req)
        }

        if (url.pathname === "/vmws") {
            try {
                const containerId = url.searchParams.get('cid');
                const success = server.upgrade(req, { data: { cid: containerId } });
                return success
            } catch (err) {
                console.error(err)
                return new Response("WebSocket upgrade error", { status: 400 });
            }
        }

        return new Response("Bun!")
    },
    websocket: {
        async message(ws, message) {
            try {
                console.info(`WebSocket Message Received from: ${JSON.stringify(ws.data)}`)
                const containerId = ws.data['cid']
                const cmd = JSON.parse(message)
                if (cmd.type === 'resize') {
                    console.info("==> Connecting to Docker Daemon")
                    const docker = new Docker({
                        protocol: 'http',
                        host: dockerHost,
                        port: 2375,
                        timeout: 1000
                    })
                    const container = docker.getContainer(containerId)
                    await container.resize(cmd.params)
                }
            } catch (error) {
                console.error(error)
            }

        }, // a message is received
        async open(ws) {
            const containerId = ws.data['cid']
            console.info(`WebSocket Connection opened: ${JSON.stringify(ws.data)}`)

            let interval;
            interval = setInterval(async () => {
                try {
                    const cmd = 'tree -J /root --dirsfirst'.split(' ')
                    // console.info("==> Running: ", cmd)
                    // console.info("==> Connecting to Docker Daemon")
                    const docker = new Docker({
                        protocol: 'http',
                        host: dockerHost,
                        port: 2375,
                        timeout: 1000
                    })

                    const container = docker.getContainer(containerId)

                    const exec = await container.exec({
                        AttachStdout: true,
                        AttachStderr: true,
                        Cmd: cmd,
                    })
                    let output = ''
                    const stream = await exec.start()
                    stream.on('data', chunk => {
                        output += chunk
                    })
                    stream.on('end', () => {
                        try {
                            output = output.substring(8)
                            // console.info(output)
                            const outjson = JSON.parse(output)
                            renderFile('filesystem.ejs', { output: outjson }, {}, function (err, str) {
                                if (err) return ws.send(err)
                                ws.send(str)
                            })
                        } catch (error) {
                            if (error instanceof(SyntaxError)) {
                                return
                            }
                            console.error(error)
                            if (interval) {
                                clearInterval(interval)
                            }
                        }
                    })
                } catch (error) {
                    console.error(error)
                }

            }, 1000);
        }, // a socket is opened
        async close(ws, code, message) {
            console.info(`WebSocket Connection closed: ${JSON.stringify(ws.data)}, ${code}, ${message}`)
            console.info("==> Connecting to Docker Daemon")
            try {
                const containerId = ws.data['cid']
                const docker = new Docker({
                    protocol: 'http',
                    host: dockerHost,
                    port: 2375,
                    timeout: 1000
                })
                const container = docker.getContainer(containerId)
                console.info("==> Removing Docker Container: ", containerId)
                await container.remove()
            } catch (error) {
                console.error(error)
            }

        },
        drain(ws) { }, // the socket is ready to receive more data
    },
});

console.log(`Listening on http://localhost:${server.port} ...`);