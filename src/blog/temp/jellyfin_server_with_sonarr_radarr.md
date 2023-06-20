title: Set up a media server with Jellyfin, Sonarr and Radarr
author: David Luévano
lang: en
summary: How to set up a media server with Jellyfin, Sonarr and Radarr, on Arch. With qBitTorrent and Jackett also.
tags: server
	tools
	code
	tutorial
	english

Riding on my excitement of having a good internet connection and having setup my *home server* now it's time to self host a media server for movies, series and anime. Everything here is performed in ==Arch Linux btw== and all commands should be run as root unless stated otherwise, as always.

I'll be exposing my stuff on a personal subdomain, but that's optional depending on your setup.

# Table of contents

[TOC]

# Prerequisites

Similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries, if you want it as a subdomain (revers proxy, SSL certificate, etc.):

- `nginx` for the reverse proxy.
- `certbot` for Let's Encrypt SSL certificates.
- `ufw` for the firewall, similar to my other entries. Else any other kind of firewall if desired.
- `yay` installed. I mentioned how to install and use it on my previous entry: [Manga server with Komga: yay](https://blog.luevano.xyz/a/manga_server_with_komga.html#yay).
- An **A** (and/or **AAAA**) or a **CNAME** for `jellyfin` (or whatever you want).
    - Optionally, another one for all *iso downloading software* (wink).
- An SSL certificate, if you're following the other entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) entry), add a `jellyfin.conf` (and optionally the *isos* subdomain config) and run `certbot --nginx` (or similar) to extend/create the certificate.

# Jackett

[Jackett](https://github.com/Jackett/Jackett) is a "proxy server" (or "middle-ware") which translates queries from apps (such as Sonarr and Radarr in this entry) into tracker-specific http queries.

Install from the AUR with `yay`:

```sh
yay -S jackett-bin
```

That's the pre-built binary, but you can build from source with `yay` by installing `jackett`. You might want to also install `flaresolverr` (AUR) to bypass *certain* protection for some sites.

## Reverse proxy

I'm going to have all my *iso downloading* services under the same subdomain, only on different subdirectories. So, create the config file `isos.conf` at the usual `sites-available/enabled` path for `nginx`:

```nginx
server {
	listen 80;
    server_name isos.yourdomain.com;

    location /jack { # you can change this to jackett or anything you'd like, but it has to match the jackett config on the next steps
        proxy_pass http://localhost:9117; # change the port according to what you want

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_redirect off;
    }
}
```

This is the basic reverse proxy config as shown in [Jackett: Running Jackett behgind a reverse proxy](https://github.com/Jackett/Jackett#running-jackett-behind-a-reverse-proxy). The rest of the services will be added under different `location` directives on their respective steps.

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

That will automatically detect the new subdomain config and create/extend your existing certificate(s). Now you can restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx
```

## Start using Jackett

You can now `start`/`enable` the `jackett.service`:

```sh
systemctl enable jackett.service
systemctl start jackett.service
```

And it will autocreate the default configuration under `/var/lib/jackett/ServerConfig.json`, which we need to edit at least to change the `BasePathOverride`:

```json
{
	"Port": 9117,
	"SomeOtherConfigs": "some_other_values",
	"BasePathOverride": "/jack",
	"MoreConfigs": "more_values",
}
```

It has to match whatever we used at the `isos.conf` file, same goes for `Port`, which I left at default (`9117`). Now restart the service:

```sh
systemctl restart jackett.service
```

And it should now be available at `https://isos.yourdomain.com/jack`. Right away go ahead and scroll down and add an admin password, because it is unprotected by default. You can change any other config you want from the Web UI, too.

# qBitTorrent

[qBitTorrent](https://wiki.archlinux.org/title/QBittorrent) is a fast, stable and light BitTorrent client that comes with many features and in my opinion it's a really user friendly client and my personal choice for years now. But you can choose whatever client you want, there are more lightweight alternatives such as [Transmission](https://wiki.archlinux.org/title/transmission).

Install the "headless" `qbittorrent` package:

```sh
pacman -S qbittorrent-nox
```

Where "nox" stands for "no X server" (the commonly used Linux display server).

By default the package doesn't install any service user, but it is recommended to have one so we can run the service under it. Create the user (it can be any name):

```sh
useradd -r -m qbittorrent
```

And decide a port number you're going to run the service on for the next steps, the default is `8080` but I'll use `30000`; it doesn't matter much, as long as it matches for all the config.

## Reverse proxy

Add the following `location` directive into the `isos.conf` with whatever subdirectory name you want, I'll call it `qbt`:

```nginx
location /qbt/ {
    proxy_pass http://localhost:30000/; # change port to whatever number you want
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;

    proxy_cookie_path / "/; Secure";
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
}
```

This is basically taken from [qBitTorrent: NGINX Revers Proxy for Web UI](https://github.com/qbittorrent/qBittorrent/wiki/NGINX-Reverse-Proxy-for-Web-UI). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx
```

## Start using qBitTorrent

You can now `start`/`enable` the `qbittorrent-nox@.service`. Remembering to use the service account created (`qbittorrent`):

```sh
systemctl enable `qbittorrent-nox@qbittorrent.service
systemctl start `qbittorrent-nox@qbittorrent.service
```

This will start `qbittorrent` using default config, we need to change the port (in my case to `30000`) and add a config for when `qbittorrent` exits (the Web UI has a close button). I guess this can be done before enabling/starting the service, but either way let's create a "drop-in" file by "editing" the service:

```sh
systemctl edit `qbittorrent-nox@qbittorrent.service
```

Which will bring up a file containing the service unit and a space where we can add/override anything. Read the comments and only add the following config on the specified text space:

```ini
[Service]
Environment="QBT_WEBUI_PORT=30000" # or whatever port number you want
Restart=on-success
RestartSec=5s
```

With this you can `restart` the service (it might ask to also reload the systemd deamon or something like that):

```sh
systemctl restart `qbittorrent-nox@qbittorrent.service
```

You can now head to `https://isos.yourdomain.com/qbt/` and login with user `admin` and password `adminadmin` (by default). First thing is that you should go and change the password in the config. The Web UI is basically the same as the normal desktop UI so if you've used it it will feel familiar. From here you can threat it as a normal torrent client and even start using it raw to download your Linux isos already.

Finish configuring whatever defaults you want such as default download location, ports to use, etc.. We're really not going to use this Web UI, but the credentials are needed for the next couple of software.

# Jellyfin

[Jellyfin](https://wiki.archlinux.org/title/Jellyfin) is a media server "manager", usually used to manage and organize video content (movies, TV series, etc.) which could be compared with [Plex](https://wiki.archlinux.org/title/plex) or [Emby](https://wiki.archlinux.org/title/Emby) for example (take them as possible alternatives).

Install from the AUR with `yay`:

```sh
pacman -S jellyfin-bin
```

Similar to `jackett` this is a pre-built binary, but you can build from source with `yay` by installing `jellyfin` (or from the latest `git` commit with `jellyfin-git`).

You can already `start`/`enable` the `jellyfin.service` which will start at `http://localhost:8096/` by default where you need to complete the initial set up. You can either allow through `ufw` and finish the setup, or create the reverse proxy through `nginx`.

## Reverse proxy

I'm going to have my `jellyfin` instance under a subdomain with an `nginx` reverse proxy as shown in the [Arch wiki](https://wiki.archlinux.org/title/Jellyfin#Nginx_reverse_proxy). For that, create a `jellyfin.conf` at the usual `sites-available/enabled` path for `nginx`:

```nginx
server {
	listen 80;
    server_name jellyfin.yourdomain.com; # change accordingly to your wanted subdomain and domain name
    set $jellyfin 127.0.0.1; # jellyfin is running at localhost (127.0.0.1)

    # Security / XSS Mitigation Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # Content Security Policy
    # See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
    # Enforces https content and restricts JS/CSS to origin
    # External Javascript (such as cast_sender.js for Chromecast) must be whitelisted.
    add_header Content-Security-Policy "default-src https: data: blob: http://image.tmdb.org; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.gstatic.com/cv/js/sender/v1/cast_sender.js https://www.youtube.com blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'self'";

        location = / {
        return 302 https://$host/web/;
    }

    location / {
        # Proxy main Jellyfin traffic
        proxy_pass http://$jellyfin:8096;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;

        # Disable buffering when the nginx proxy gets very resource heavy upon streaming
        proxy_buffering off;
    }

    # location block for /web - This is purely for aesthetics so /web/#!/ works instead of having to go to /web/index.html/#!/
    location = /web/ {
        # Proxy main Jellyfin traffic
        proxy_pass http://$jellyfin:8096/web/index.html;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
    }

    location /socket {
        # Proxy Jellyfin Websockets traffic
        proxy_pass http://$jellyfin:8096;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
    }
}
```

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

Similarly to `jackett`, that will autodetect the new subdomain and extend the existing certificate(s). Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx
```

## Start using Jellyfin

You can now `start`/`enable` the `jellyfin.service`:

```sh
systemctl enable jellyfin.service
systemctl start jellyfin.service
```

Then navigate to `https://jellyfin.yourdomain.com` and either continue with the set up wizard if you didn't already or continue with the next steps to configure your libraries.