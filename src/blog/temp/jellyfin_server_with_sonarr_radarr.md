title: Set up a media server with Jellyfin, Sonarr and Radarr
author: David Luévano
lang: en
summary: How to set up a media server with Jellyfin, Sonarr and Radarr, on Arch. With qBitTorrent and Jackett also.
tags: server
	tools
	code
	tutorial
	english

Riding on my excitement of having a good internet connection and having setup my *home server* now it's time to self host a media server for movies, series and anime. I'll be exposing my stuff on a personal (in the sense that I own it and it's going to be used for that only) subdomain, but that's optional depending on your setup.

Most of my config is based on [TRaSH-Guides](https://trash-guides.info/) (I'll only mention it as "TRaSH", without the "-Guides") and will be mentioned when needed; I just mention it here in case I forget to give credit on the respective areas. Specially have a read at the [TRaSH: Native folder structure](https://trash-guides.info/Hardlinks/How-to-setup-for/Native/) as it is a very good setup along with the [TRaSH: Hardlinks and instant moves](https://trash-guides.info/Hardlinks/Hardlinks-and-Instant-Moves/).

Everything here is performed in ==Arch Linux btw== and all commands should be run as root unless stated otherwise, as always.

==Also kindly note that I do not condone the use of BitTorrent for illegal activities. I take no responsibility for what you do when setting up anything shown here. It is for you to check your local laws before using automated downloaders such as Sonarr and Radarr.==

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

## Create directory structure

This is just the creation of the basic directory structure, as mentioned in [TRaSH: Native folder structure](https://trash-guides.info/Hardlinks/How-to-setup-for/Native/). I'll be using my steps to create default directory permissions on the directories as shown in my [Komga setup guide](https://blog.luevano.xyz/a/manga_server_with_komga#set-default-directory-permissions.html).

First of all, create a service user called `servarr` that all services will use the group of:

```sh
useradd -r -s /usr/bin/nologin -M -c "Servarr applications" servarr
```

Then the desired behaviour is: set `servarr` as group ownership, set write access to group and whenever a new directory/file is created, inherit these permission settings.

Create the `jellyfin` directory (this might come back and bite me in the ass later because of the `qbittorrent` download path) default permissions:

```sh
# some of these commands depend on which user created the directory
mkdir /mnt/a/jellyfin
chown servarr:servarr /mnt/a/jellyfin
chmod g+w /mnt/a/jellyfin
chmod g+s /mnt/a/jellyfin
setfacl -d -m g::rwx /mnt/a/jellyfin
setfacl -d -m o::rx /mnt/a/jellyfin
```

Then check that the permissions are set correctly (`getfacl /mnt/a/jellyfin`)

```
getfacl: Removing leading '/' from absolute path names
# file: mnt/a/jellyfin
# owner: servarr
# group: servarr
# flags: -s-
user::rwx
group::rwx
other::r-x
default:user::rwx
default:group::rwx
default:other::r-x
```

Then the subdirectories can be created using any user (the group permissions should be set automatically) then you can change the owner to `servarr` if you want:

```sh
cd /mnt/a/jellyfin
mkdir torrents/{tv,movies,anime}
mkdir media/{tv,movies,anime}
chown -R servarr: /mnt/a/jellyfin
```

Later, add any user to the `servarr` grup if it needs access to write. These should be `qbittorrent`, `sonarr`, `radarr` and `jellyfin`, for example by running:

```sh
gpasswd -a <USER> servarr
```

# Jackett

[Jackett](https://github.com/Jackett/Jackett) is a "proxy server" (or "middle-ware") which translates queries from apps (such as Sonarr and Radarr in this entry) into tracker-specific http queries. Note that there is an alternative called [Prowlarr](https://github.com/Prowlarr/Prowlarr) that it's actually better integrated with Sonarr and Radarr, requiring less maintenance; I'll still be using Jackett.

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

This is the basic reverse proxy config as shown in [Jackett: Running Jackett behgind a reverse proxy](https://github.com/Jackett/Jackett#running-jackett-behind-a-reverse-proxy). The rest of the services will be added under different `location` block on their respective steps.

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

### Indexers

For Jackett, an indexer is just a jackett configured tracker for some of the commonly known trackers/torrent sites, it comes pre-configured and you can select different indexer URL, useful when the site is down and you need to use a mirror. Some indexers come with extra features/configuration depending on what the site specializes on, for example the `Nyaa.si` indexer has options to provide better season information to Sonarr, and options for filter, category, etc..

To add an indexer click on the "+ Add Indexer" at the top of the Web UI and look for indexers you know, for example *The Pirate Bay*, *Nyaa*, *1337x*, etc., then click on the "+" icon on the far-most right (or select the ones you want and scroll all the way to the bottom to add all selected) for each indexer you want. They then will show as a list with some available actions such as "Copy RSS Feed", "Copy Torznab Feed", "Copy Potato Feed", a button to search, configure, delete and test the indexer, as shown below:

![Jacket: configured indexers](${SURL}/images/b/jack/jack_configured_indexers.png "Jackett: configured indexers")

You can manually test the indexers by doing a basic search, in case you don't trust the "Test" button. For example:

![Jacket: example search on tpb](${SURL}/images/b/jack/jack_example_search.png "Jackett: example search on tpb")

We'll come back to Jackett to continue setting up Sonarr/Radarr with some indexers at their respective moments.

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

==Don't forget to add the `qbittorrent` user to the `servarr` group.==

## Reverse proxy

Add the following `location` block into the `isos.conf` with whatever subdirectory name you want, I'll call it `qbt`:

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

This is taken from [qBitTorrent: NGINX Revers Proxy for Web UI](https://github.com/qbittorrent/qBittorrent/wiki/NGINX-Reverse-Proxy-for-Web-UI). Restart the `nginx` service for the changes to take effect:

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

### Configuration

It should be usable already but we can go further and fine tune it, specially to some kind of "convention" as shown in [TRaSH: qBitTorrent basic setup](https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/) and subsequent `qbittorrent` guides.

I use all the suggested settings, where the only "changes" are for personal paths, ports, and in general connection settings that depend on my set up. The only super important setting I noticed that can affect our setup (meaning what is described in this entry) is the *Web UI -> Authentication* for the "Bypass authentication for cliens on localhost". This will be an issue because the reverse proxy is accessing `qbittorrent` via the localhost, so this will make the service open to the world, experiment at your own risk.

Finally, add categories by following [TRaSH: qBitTorrent how to add categories](https://trash-guides.info/Downloaders/qBittorrent/How-to-add-categories/). I added 3: `tv`, `movies` and `anime`.

# Radarr

[Radarr](https://radarr.video/) is a movie collection manager that can be used to download movies via torrents. This is actually a fork of Sonarr, but Sonarr is harder to set up in my opinion so I'm starting with this one.

Install from the AUR with `yay`:

```sh
yay -S radarr
```

The default port that Radarr uses is `7878` for http (the one we need for our reverse proxy).

==Don't forget to add the `radarr` user to the `servarr` group.==

## Reverse proxy

Add the following `location` block into the `isos.conf` with whatever subdirectory name you want, I'll leave it as `radarr` as stated in the official documentation:

```nginx
location /radarr {
    proxy_pass http://localhost:7878; # change port if needed, this is the default
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;

    proxy_redirect off;
}
# Allow the API External Access via NGINX
location /radarr/api {
    auth_basic off;
    proxy_pass http://localhost:7878; # change port if needed, this is the default
}
```

This is taken from [Radarr Installation: Reverse Proxy Configuration: NGINX](https://wiki.servarr.com/radarr/installation#nginx). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx
```

## Start using Radarr

You can now `start`/`enable` the `radarr.service`:

```sh
systemctl enable radarr.service
systemctl start radarr.service
```

This will start the service and create the default configs under `/var/lib/radarr`, but we need to change the `URLBase` as we're running the reverse proxy under a subdirectory (`/radarr`). Edit `/var/lib/radarr/config.xml` and change the `URLBase` config:

```xml
...
<UrlBase>/radarr</UrlBase>
...
```

Then restart the service:

```sh
systemctl restart radarr.service
```

And head to `https://isos.yourdomain.com/radarr` and again go straight to secure the instance by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username, password and click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials.

### Configuration

Now, this is the most tedious part, and I'm going to go for all of the defaults plus recommended configs (for the [TRaSH-Guides](https://trash-guides.info/), for example) according to the official [Radarr: Quick Start Guide](https://wiki.servarr.com/radarr/quick-start-guide). I'll be adding anything that is either not mentioned in the guide, or that is specific to how I'm setting up stuff in this entry.

# Jellyfin

[Jellyfin](https://wiki.archlinux.org/title/Jellyfin) is a media server "manager", usually used to manage and organize video content (movies, TV series, etc.) which could be compared with [Plex](https://wiki.archlinux.org/title/plex) or [Emby](https://wiki.archlinux.org/title/Emby) for example (take them as possible alternatives).

Install from the AUR with `yay`:

```sh
yay -S jellyfin-bin
```

Similar to `jackett` this is a pre-built binary, but you can build from source with `yay` by installing `jellyfin` (or from the latest `git` commit with `jellyfin-git`).

You can already `start`/`enable` the `jellyfin.service` which will start at `http://localhost:8096/` by default where you need to complete the initial set up. You can either allow through `ufw` and finish the setup, or create the reverse proxy through `nginx`.

==Don't forget to add the `jellyfin` user to the `servarr` group.==

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
