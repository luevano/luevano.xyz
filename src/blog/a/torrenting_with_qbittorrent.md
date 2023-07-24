title: Set up qBitTorrent with Jackett for use with Starr apps
author: David Luévano
lang: en
summary: How to set up a torrenting solution with qBitTorrent in preparation for a media server with Jellyfin and Starr apps, on Arch. With Jackett and flaresolverr, too.
tags: server
	tools
	code
	tutorial
	english

Riding on my excitement of having a good internet connection and having setup my *home server* now it's time to self host a media server for movies, series and anime. I'll setup qBitTorrent as the downloader, Jackett for the trackers, the *Starr apps* for the automatic downloading and Jellyfin as the media server manager/media viewer. This was going to be a single entry but it ended up being a really long one so I'm splitting it, this being the first part.

I'll be exposing my stuff on a subdomain only so I can access it while out of home and for SSL certificates (not required), but shouldn't be necessary and instead you can use a VPN ([how to set up](https://blog.luevano.xyz/a/vpn_server_with_openvpn.html)). For your reference, whenever I say "Starr apps" (\*arr apps) I mean the family of apps such as Sonarr, Radarr, Bazarr, Readarr, Lidarr, etc..

Most of my config is based on the [TRaSH-Guides](https://trash-guides.info/) (will be mentioned as "TRaSH" going forward). Specially get familiar with the [TRaSH: Native folder structure](https://trash-guides.info/Hardlinks/How-to-setup-for/Native/) and with the [TRaSH: Hardlinks and instant moves](https://trash-guides.info/Hardlinks/Hardlinks-and-Instant-Moves/). Will also use the default configurations based on the respective documentation for each Starr app and service, except when stated otherwise.

Everything here is performed in ==arch btw== and all commands should be run as root unless stated otherwise.

==Kindly note that I do not condone the use of torrenting for illegal activities. I take no responsibility for what you do when setting up anything shown here. It is for you to check your local laws before using automated downloaders such as Sonarr and Radarr.==

# Table of contents

[TOC]

# Prerequisites

The specific programs are mostly recommendations, if you're familiar with something else or want to change things around, feel free to do so but everything will be written with them in mind.

If you want to expose to a (sub)domain, then similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) for the reverse proxy plus certificates):

- `nginx` for the reverse proxy.
- `certbot` for the SSL certificates.
- `ufw` for the firewall.
- `yay` to install AUR packages.
    - I mentioned how to install and use it on my previous entry: [Manga server with Komga: yay](https://blog.luevano.xyz/a/manga_server_with_komga.html#yay).
- An **A** (and/or **AAAA**) or a **CNAME** for `isos` (or whatever you want to call it).
    - For automation software (qBitTorrent, Jackett, Starr apps, etc.). One subdomain per service can be used instead.

==Note: I'm using the explicit `127.0.0.1` ip instead of `localhost` in the reverse proxies/services config as `localhost` resolves to `ipv6` sometimes which is not configured on my server correctly.== If you have it configured you can use `localhost` without any issue.

## Directory structure

Basically following [TRaSH: Native folder structure](https://trash-guides.info/Hardlinks/How-to-setup-for/Native/) except for the directory permissions part, I'll do the same as with my [Komga setup guide](https://blog.luevano.xyz/a/manga_server_with_komga#set-default-directory-permissions.html) to stablish default group permissions.

The desired behaviour is: set `servarr` as group ownership, set write access to group and whenever a new directory/file is created, inherit these permission settings. `servarr` is going to be a service user and I'll use the root of a mounted drive at `/mnt/a`.

1. Create a service user called `servarr` (it could just be a group, too):

```sh
useradd -r -s /usr/bin/nologin -M -c "Servarr applications" servarr
```

2. Create the `torrents` directory and set default permissions:

```sh
cd /mnt/a # change this according to your setup
mkdir torrents
chown servarr:servarr torrents
chmod g+w torrents
chmod g+s torrents
setfacl -d -m g::rwx torrents
setfacl -d -m o::rx torrents
```

3. Check that the permissions are set correctly (`getfacl torrents`)

```
# file: torrents/
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

4. Create the subdirectories you want with any user (I'll be using `servarr` personally):

```sh
mkdir torrents/{tv,movies,anime}
chown -R servarr: torrents
```

5. Finally repeat steps 2 - 4 for the `media` directory.

The final directory structure should be the following:

```
root_dir
├── torrents
│   ├── movies
│   ├── music
│   └── tv
└── media
    ├── movies
    ├── music
    └── tv
```

Where `root_dir` is `/mnt/a` in my case. This is going to be the reference for the following applications set up.

Later, add the necessary users to the `servarr` group if they need write access, by executing:

```sh
gpasswd -a <USER> servarr
```

# Jackett

[Jackett](https://github.com/Jackett/Jackett) is a "proxy server" (or "middle-ware") that translates queries from apps (such as the Starr apps in this case) into tracker-specific http queries. Note that there is an alternative called [Prowlarr](https://github.com/Prowlarr/Prowlarr) that is better integrated with most if not all Starr apps, requiring less maintenance; I'll still be sticking with Jackett, though.

Install from the AUR with `yay`:

```sh
yay -S jackett
```

I'll be using the default `9117` port, but change accordingly if you decide on another one.

## Reverse proxy

I'm going to have most of the services under the same subdomain, with different subdirectories. Create the config file `isos.conf` at the usual `sites-available/enabled` path for `nginx`:

```nginx
server {
	listen 80;
    server_name isos.yourdomain.com;

    location /jack { # you can change this to jackett or anything you'd like, but it has to match the jackett config on the next steps
        proxy_pass http://127.0.0.1:9117; # change the port according to what you want

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_redirect off;
    }
}
```

This is the basic reverse proxy config as shown in [Jackett: Running Jackett behind a reverse proxy](https://github.com/Jackett/Jackett#running-jackett-behind-a-reverse-proxy). The rest of the services will be added under different `location` block on their respective steps.

### SSL certificate

Create/extend the certificate by running:

```sh
certbot --nginx
```

That will automatically detect the new subdomain config and create/extend your existing certificate(s). Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using Jackett

You can now `start`/`enable` the `jackett.service`:

```sh
systemctl enable jackett.service
systemctl start jackett.service
```

It will autocreate the default configuration under `/var/lib/jackett/ServerConfig.json`, which you need to edit at least to change the `BasePathOverride` to match what you used in the `nginx` config:

```json
{
	"Port": 9117,
	"SomeOtherConfigs": "some_other_values",
	"BasePathOverride": "/jack",
	"MoreConfigs": "more_values",
}
```

Also modify the `Port` if you changed it. Restart the `jackett` service:

```sh
systemctl restart jackett.service
```

It should now be available at `https://isos.yourdomain.com/jack`. ==Add an admin password right away== by scroll down and until the first config setting; don't forget to click on "Set Password". Change any other config you want from the Web UI, too (you'll need to click on the blue "Apply server settings" button).

Note that you need to set the "Base URL override" to `http://127.0.0.1:9117` (or whatever port you used) so that the "Copy Torznab Feed" button works for each indexer.

### Indexers

For Jackett, an indexer is just a configured tracker for some of the commonly known torrent sites. Jackett comes with a lot of pre-configured public and private indexers which usually have multiple URLs (mirrors) per indexer, useful when the main torrent site is down. Some indexers come with extra features/configuration depending on what the site specializes on.

To add an indexer click on the "+ Add Indexer" at the top of the Web UI and look for indexers you want, then click on the "+" icon on the far-most right for each indexer or select the ones you want (clicking on the checkbox on the far-most left of the indexer) and scroll all the way to the bottom to click on "Add Selected". They then will show as a list with some available actions such as "Copy RSS Feed", "Copy Torznab Feed", "Copy Potato Feed", a button to search, configure, delete and test the indexer, as shown below:

![Jacket: configured indexers](${SURL}/images/b/jack/jack_configured_indexers.png "Jackett: configured indexers")

You can manually test the indexers by doing a basic search to see if they return anything, either by searching on each individual indexer by clicking on the magnifying glass icon on the right of the indexer or clicking on "Manual Search" button which is next to the "+ Add Indexer" button at the top right.

Explore each indexer's configuration in case there is stuff you might want to change.

## FlareSolverr

[FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) is used to bypass *certain* protection that some torrent sites have. This is not 100% necessary and only needed for some trackers sometimes, it also doesn't work 100%.

You could install from the AUR with `yay`:

```sh
yay -S flaresolverr-bin
```

At the time of writing, the `flaresolverr` package didn't work for me because of `python-selenium`. `flaresolverr-bin` was updated around the time I was writing this, so that is what I'm using and what's working fine so far, it contains almost everything needed (it has self contained libraries) except for `xfvb`.

Install dependencies via `pacman`:

```sh
pacman -S xorg-server-xvfb
```

You can now `start`/`enable` the `flaresolverr.service`:

```sh
systemctl enable flaresolverr.service
systemctl start flaresolverr.service
```

Verify that the service started correctly by checking the logs:

```sh
journalctl -fxeu flaresolverr
```

It should show "Test successful" and "Serving on http://0.0.0.0:8191" (which is the default). Jackett now needs to be configured by adding `http://127.0.0.1:8191` almost at the end in the "FlareSolverr API URL" field, then click on the blue "Apply server settings" button at the beginning of the config section. This doesn't need to be exposed or anything, it's just an internal API that Jackett (or anything you want) will use.

# qBitTorrent

[qBitTorrent](https://wiki.archlinux.org/title/QBittorrent) is a fast, stable and light BitTorrent client that comes with many features and in my opinion it's a really user friendly client and my personal choice for years now. But you can choose whatever client you want, there are more lightweight alternatives such as [Transmission](https://wiki.archlinux.org/title/transmission).

Install the `qbittorrent-nox` package ("nox" as in "no X server"):

```sh
pacman -S qbittorrent-nox
```

By default the package doesn't create any (service) user, but it is recommended to have one so you can run the service under it. Create the user, I'll call it `qbittorrent` and leave it with the default homedir (`/home`):

```sh
useradd -r -m qbittorrent
```

==Add the `qbittorrent` user to the `servarr` group:==

```sh
gpasswd -a qbittorrent servarr
```

Decide a port number you're going to run the service on for the next steps, the default is `8080` but I'll use `30000`; it doesn't matter much, as long as it matches for all the config. This is the `qbittorrent` service port, it is used to connect to the instance itself through the Web UI or via API, ==you also need to open a port for listening to peer connections.== Choose any port you want, for example `50000` and open it with your firewall, `ufw` in my case:

```sh
ufw allow 50000/tcp comment "qBitTorrent - Listening port"
```

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

This is taken from [qBitTorrent: Nginx reverse proxy for Web UI](https://github.com/qbittorrent/qBittorrent/wiki/NGINX-Reverse-Proxy-for-Web-UI). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx.service
```

## Start using qBitTorrent

You can now `start`/`enable` the `qbittorrent-nox@.service` using the service account created (`qbittorrent`):

```sh
systemctl enable `qbittorrent-nox@qbittorrent.service
systemctl start `qbittorrent-nox@qbittorrent.service
```

This will start `qbittorrent` using default config. You need to change the port (in my case to `30000`) and set `qbittorrent` to restart on exit (the Web UI has a close button). I guess this can be done before enabling/starting the service, but either way let's create a "drop-in" file by "editing" the service:

```sh
systemctl edit `qbittorrent-nox@qbittorrent.service
```

Which will bring up a file editing mode containing the service unit and a space where you can add/override anything, add:

```ini
[Service]
Environment="QBT_WEBUI_PORT=30000" # or whatever port number you want
Restart=on-success
RestartSec=5s
```

When exiting from the file (if you wrote anything) it will create the override config. Restart the service for changes to take effect (you might be asked to reload the systemd daemon):

```sh
systemctl restart `qbittorrent-nox@qbittorrent.service
```

You can now head to `https://isos.yourdomain.com/qbt/` and login with user `admin` and password `adminadmin` (by default). ==Change the default password right away== by going to *Tools -> Options -> Web UI -> Authentication*. The Web UI is basically the same as the normal desktop UI so if you've used it it will feel familiar. From here you can threat it as a normal torrent client and even start using for other stuff other than the specified here.

### Configuration

It should be usable already but you can go further and fine tune it, specially to some kind of "convention" as shown in [TRaSH: qBitTorrent basic setup](https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/) and subsequent `qbittorrent` guides.

I use all the suggested settings by *TRaSH*, where the only "changes" are for personal paths, ports, and in general connection settings that depend on my setup. The only super important setting I noticed that can affect our setup (meaning what is described in this entry) is the *Web UI -> Authentication* for the "Bypass authentication for clients on localhost". This will be an issue because the reverse proxy is accessing `qbittorrent` via `localhost`, so this will make the service open to the world, experiment at your own risk.

Finally, add categories by following [TRaSH: qBitTorrent how to add categories](https://trash-guides.info/Downloaders/qBittorrent/How-to-add-categories/), basically right clicking on *Categories -> All (x)* (located at the left of the Web UI) and then on "Add category"; I use the same "Category" and "Save Path" (`tv` and `tv`, for example), where the "Save Path" will be a subdirectory of the configured global directory for torrents ([TRaSH: qBitTorent paths and categories breakdown](https://trash-guides.info/Downloaders/qBittorrent/How-to-add-categories/#paths-and-categories-breakdown)). I added 3: `tv`, `movies` and `anime`.

### Trackers

Often some of the trackers that come with torrents are dead or just don't work. You have the option to add extra trackers to torrents either by:

- Automatically add a predefined list on new torrents: configure at *Tools -> Options -> BitTorrent*, enable the last option "Automatically add these trackers to new downloads" then add the list of trackers. This should only be done on public torrents as private ones might ban you or something.
- Manually add a list of trackers to individual torrents: configure by selecting a torrent, clicking on *Trackers* on the bottom of the Web UI, right clicking on an empty space and selecting "Add trackers..." then add the list of trackers.

On both options, the list of trackers need to have at least one new line in between each new tracker. You can find trackers from the following sources:

- [List of stable trackers](https://newtrackon.com/list)
- [ngosang/trackerslist](https://github.com/ngosang/trackerslist)
    - It also mentions [Third party tools](https://github.com/ngosang/trackerslist#third-party-tools) to automate this process.

Both sources maintain an updated list of trackers. You also might need to enable an advanced option so all the new trackers are contacted ([Only first tracker contacted](https://github.com/qbittorrent/qBittorrent/issues/7882)): configure at *Tools -> Options -> Advanced -> libtorrent Section* and enable both "Always announce to all tiers" and "Always announce to all trackers in a tier".
