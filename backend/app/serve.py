"""Production entry point: uvicorn on one dual-stack (IPv4 + IPv6) socket.

`uvicorn --host ::` is IPv6-only, because asyncio sets IPV6_V6ONLY on the socket. Railway's
healthcheck connects over IPv4 and its private network can use IPv6, so we bind the socket
ourselves with V6ONLY off and hand it to uvicorn.

    python -m app.serve        # listens on [::]:$PORT (default 8000)
"""

import os
import socket

import uvicorn


def dual_stack_socket(port: int) -> socket.socket:
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    sock.bind(("::", port))
    sock.set_inheritable(True)
    return sock


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    config = uvicorn.Config(
        "app.main:app",
        proxy_headers=True,  # the rate limiter sees the visitor's IP from X-Forwarded-For
        forwarded_allow_ips="*",
    )
    uvicorn.Server(config).run(sockets=[dual_stack_socket(port)])


if __name__ == "__main__":
    main()
