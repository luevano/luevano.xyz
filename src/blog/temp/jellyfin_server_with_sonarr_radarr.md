title: Set up a media server with Jellyfin, Sonarr and Radarr
author: David Luévano
lang: en
summary: How to set up a media server with Jellyfin, Sonarr and Radarr, on Arch. With qBitTorrent and Jackett with flaresolverr also.
tags: server
	tools
	code
	tutorial
	english

Riding on my excitement of having a good internet connection and having setup my *home server* now it's time to self host a media server for movies, series and anime. I'll be exposing my stuff on a subdomain only so I can access it while out of home and for SSL certificates (not required), but shouldn't be necessary and instead you can use a VPN ([how to set up](https://blog.luevano.xyz/a/vpn_server_with_openvpn.html)). For your reference, whenever I say "Starr apps" (\*arr apps) I mean the family of apps such as Sonarr, Radarr, Readarr, Lidarr, etc..

Most of my config is based on [TRaSH-Guides](https://trash-guides.info/), in case I forget to mention it explicitly on its respective areas, which will be mentioned as "TRaSH" going forward. Specially get familiar with the [TRaSH: Native folder structure](https://trash-guides.info/Hardlinks/How-to-setup-for/Native/) and with the [TRaSH: Hardlinks and instant moves](https://trash-guides.info/Hardlinks/Hardlinks-and-Instant-Moves/). Will use default configurations based on the respective documentation for each service (Sonarr, Radarr, Bazarr), except when stated otherwise.

Everything here is performed in ==arch btw== and all commands should be run as root unless stated otherwise.

==Also kindly note that I do not condone the use of BitTorrent for illegal activities. I take no responsibility for what you do when setting up anything shown here. It is for you to check your local laws before using automated downloaders such as Sonarr and Radarr.==

# Table of contents

[TOC]

# Prerequisites

- A firewall is always strongly recommended to secure your service, and in this case we need to open some ports, specially for `qbittorrent`. I like to use `ufw`, but anything you're comfortable with works.

If you want to expose to a (sub)domain, then similar to my early [tutorial](https://blog.luevano.xyz/tag/@tutorial.html) entries (specially the [website](https://blog.luevano.xyz/a/website_with_nginx.html) for the reverse proxy plus certificates) I'll use:

- `nginx` for the reverse proxy.
- `certbot` for the SSL certificates.
- `yay` to install AUR packages.
    - I mentioned how to install and use it on my previous entry: [Manga server with Komga: yay](https://blog.luevano.xyz/a/manga_server_with_komga.html#yay).
- An **A** (and/or **AAAA**) or a **CNAME** for `jellyfin`.
    - Optionally, another one for all automation software (Jackett, Starr apps, etc.). You can use one subdomain per service, but I'll put them all under `isos` in the examples shown.

You don't need to use these in specific, but everything will be written with these in mind.

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
        proxy_pass http://localhost:9117; # change the port according to what you want

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
systemctl restart nginx
```

## Start using Jackett

You can now `start`/`enable` the `jackett.service`:

```sh
systemctl enable jackett.service
systemctl start jackett.service
```

It will autocreate the default configuration under `/var/lib/jackett/ServerConfig.json`, which we need to edit at least to change the `BasePathOverride` to match what we used in the `nginx` config:

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

It should now be available at `https://isos.yourdomain.com/jack`. Add an admin password right away by scroll down and until the first config setting; don't forget to click on "Set Password". You can change any other config you want from the Web UI, too (you'll need to click on "Apply server settings").

### Indexers

For Jackett, an indexer is just a configured tracker for some of the commonly known torrent sites. Jackett comes with a lot of pre-configured public and private indexers which usually have multiple URLs (mirrors) per indexer, useful when the main torrent site is down. Some indexers come with extra features/configuration depending on what the site specializes on.

To add an indexer click on the "+ Add Indexer" at the top of the Web UI and look for indexers you want, then click on the "+" icon on the far-most right for each indexer or select the ones you want (clicking on the checkbox on the far-most left of the indexer) and scroll all the way to the bottom to click on "Add Selected". They then will show as a list with some available actions such as "Copy RSS Feed", "Copy Torznab Feed", "Copy Potato Feed", a button to search, configure, delete and test the indexer, as shown below:

![Jacket: configured indexers](${SURL}/images/b/jack/jack_configured_indexers.png "Jackett: configured indexers")

You can manually test the indexers by doing a basic search to see if they return anything, either by searching on each individual indexer by clicking on the magnifying glass icon on the right of the indexer or clicking on "Manual Search" button which is next to the "+ Add Indexer" button at the top right.

Explore each indexer's configuration in case there is stuff you might want to change.

## FlareSolverr

[FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) is used to bypass *certain* protection that some sites have. This is not 100% necessary and only needed for some trackers sometimes.

You could install from the AUR with `yay`:

```sh
yay -S flaresolverr
```

But at the time of writing, the package wont work for the following reasons:

- The `python-selenium` package that it requires doesn't build (actually it just doesn't pass the tests).
- The `python-selenium` package is a higher version than the required by `flaresolverr`, and it's a breaking change version (they don't follow semantic versioning), so even if you are able to install `python-selenium` (by just removing the checks) it will still fail due to this check.

### Manual installation

For now the best next thing is to manually set it up using a python virtual environment. I'll be taking some elements from the AUR package. Only package requirements are `chromium` and `xorg-server-xvfb`, needed for the `selenium` webdriver and a virtual X server.

Install dependencies via pacman:

```sh
pacman -S chromium xorg-server-xvfb
```

Create a new service user called `flaresolverr` ([flaresolverr.sysusers](https://aur.archlinux.org/cgit/aur.git/tree/flaresolverr.sysusers?h=flaresolverr)):

```sh
useradd -r -s /usr/bin/nologin -c "FlareSolverr" -d "/opt/flaresolverr" flaresolverr
```

Clone the [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) git repo in `/opt` and get inside it:

```sh
cd /opt
git clone git@github.com:FlareSolverr/FlareSolverr.git
mv FlareSolverr/ flaresolverr
cd flaresolverr
```

Create a python environment called `.venv`, activate it and install the requirements:

```sh
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Finally just change the ownership of the `/opt/flaresolverr` directory:

```sh
chown -R flaresolverr:flaresolverr /opt/flaresolverr/
```

#### Creating a systemd service

You could just execute `python src/flaresolverr.py` while in the python virtual environment, but we want it as a service. Create a systemd service file `flaresolverr.service` ([flaresolverr.service](https://aur.archlinux.org/cgit/aur.git/tree/flaresolverr.service?h=flaresolverr) with few modifications) in `/etc/systemd/system`:

```ini
[Unit]
Description=FlareSolverr
After=network.target

[Service]
SyslogIdentifier=flaresolverr
Restart=always
RestartSec=5
Type=simple
User=flaresolverr
Group=flaresolverr
Environment="LOG_LEVEL=info"
Environment="CAPTCHA_SOLVER=none"
WorkingDirectory=/opt/flaresolverr
ExecStart=/opt/flaresolverr/.venv/bin/python /opt/flaresolverr/src/flaresolverr.py # note the venv python and that it uses the "src" directory for the git repo
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

We can now `start`/`enable` the `flaresolverr.service`:

```sh
systemctl enable flaresolverr.service
systemctl start flaresolverr.service
```

You can check that the service started correctly by checking the logs:

```sh
journalctl -fxeu flaresolverr
```

It should show "Test successful" and "Serving on http://0.0.0.0:8191" (which is the default). Jackett will need to be configured if FlareSolverr is served on anything different than the default.

==Note that since this was a manual setup, if `python` gets updated it will probably break the virtual environment (just re-do that part). If FlareSolverr gets updated, you might need to stash the changes (because of the service file) and do a git pull (probably install the requirements again, too). Until the AUR packages are fixed, at least.==

# qBitTorrent

[qBitTorrent](https://wiki.archlinux.org/title/QBittorrent) is a fast, stable and light BitTorrent client that comes with many features and in my opinion it's a really user friendly client and my personal choice for years now. But you can choose whatever client you want, there are more lightweight alternatives such as [Transmission](https://wiki.archlinux.org/title/transmission).

Install the headless `qbittorrent` package ("nox" as in "no X server"):

```sh
pacman -S qbittorrent-nox
```

By default the package doesn't install any (service) user, but it is recommended to have one so we can run the service under it. Create the user, I'll call it `qbittorrent` and leave it with the default homedir (`/home`):

```sh
useradd -r -m qbittorrent
```

==Add the `qbittorrent` user to the `servarr` group:==

```sh
gpasswd -a qbittorrent servarr
```

Decide a port number you're going to run the service on for the next steps, the default is `8080` but I'll use `30000`; it doesn't matter much, as long as it matches for all the config.

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

You can now `start`/`enable` the `qbittorrent-nox@.service` using the service account created (`qbittorrent`):

```sh
systemctl enable `qbittorrent-nox@qbittorrent.service
systemctl start `qbittorrent-nox@qbittorrent.service
```

This will start `qbittorrent` using default config. We need to change the port (in my case to `30000`) and set `qbittorrent` to restart on exit (the Web UI has a close button). I guess this can be done before enabling/starting the service, but either way let's create a "drop-in" file by "editing" the service:

```sh
systemctl edit `qbittorrent-nox@qbittorrent.service
```

Which will bring up a file editing mode containing the service unit and a space where we can add/override anything, add:

```ini
[Service]
Environment="QBT_WEBUI_PORT=30000" # or whatever port number you want
Restart=on-success
RestartSec=5s
```

When saving and exiting from the file it will create the override config. Restart the service for changes to take effect (it might ask to also reload the systemd deamon or something like that):

```sh
systemctl restart `qbittorrent-nox@qbittorrent.service
```

You can now head to `https://isos.yourdomain.com/qbt/` and login with user `admin` and password `adminadmin` (by default). Change the default password right away by going to *Tools -> Options -> Web UI -> Authentication*. The Web UI is basically the same as the normal desktop UI so if you've used it it will feel familiar. From here you can threat it as a normal torrent client and even start using for other stuff other than the specified here.

### Configuration

It should be usable already but we can go further and fine tune it, specially to some kind of "convention" as shown in [TRaSH: qBitTorrent basic setup](https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/) and subsequent `qbittorrent` guides.

I use all the suggested settings, where the only "changes" are for personal paths, ports, and in general connection settings that depend on my setup. The only super important setting I noticed that can affect our setup (meaning what is described in this entry) is the *Web UI -> Authentication* for the "Bypass authentication for clients on localhost". This will be an issue because the reverse proxy is accessing `qbittorrent` via the localhost, so this will make the service open to the world, experiment at your own risk.

Finally, add categories by following [TRaSH: qBitTorrent how to add categories](https://trash-guides.info/Downloaders/qBittorrent/How-to-add-categories/). I added 3: `tv`, `movies` and `anime`.

# Radarr

[Radarr](https://radarr.video/) is a movie collection manager that can be used to download movies via torrents. This is actually a fork of Sonarr, so they're pretty similar, I just wanted to set up movies first.

Install from the AUR with `yay`:

```sh
yay -S radarr
```

==Add the `radarr` user to the `servarr` group:==

```sh
gpasswd -a radarr servarr
```

The default port that Radarr uses is `7878` for http (the one we need for our reverse proxy).

## Reverse proxy

Add the following `location` blocks into the `isos.conf` with whatever subdirectory name you want, I'll leave it as `radarr`:

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

This will start the service and create the default configs under `/var/lib/radarr`. We need to change the `URLBase` as we're running the reverse proxy under a subdirectory (`/radarr`). Edit `/var/lib/radarr/config.xml` and change the `URLBase` config:

```xml
...
<UrlBase>/radarr</UrlBase>
...
```

Then restart the `radarr` service:

```sh
systemctl restart radarr.service
```

Now `https://isos.yourdomain.com/radarr` is accessible. Again go straight to secure the instance by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username and password then click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials.

### Configuration

This is the most tedious part, but I'm going to go for most of the defaults plus recommended configs (by [TRaSH](https://trash-guides.info/)) according to the official [Radarr: Quick start guide](https://wiki.servarr.com/radarr/quick-start-guide). Anything that is either not mentioned in the guide, or that is specific to how I'm setting up stuff in this entry will be stated below.

#### Media Management

- **Movie Naming**:
    - *Standard Movie Format*:

    ```
    {Movie CleanTitle} {(Release Year)} [imdbid-{ImdbId}] - {Edition Tags }{[Custom Formats]}{[Quality Full]}{[MediaInfo 3D]}{[MediaInfo VideoDynamicRangeType]}{[Mediainfo AudioCodec}{ Mediainfo AudioChannels}]{MediaInfo AudioLanguages}[{MediaInfo VideoBitDepth}bit][{Mediainfo VideoCodec}]{-Release Group}
    ```

    - *Movie Folder Format*:

    ```
    {Movie CleanTitle} ({Release Year}) [imdbid-{ImdbId}]
    ```

- **File Management**:
    - *Propers and Repacks*: set it to "Do Not Prefer" and instead we'll use the [Repack/Proper](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#repackproper) [custom format by TRaSH](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats).

#### Quality

This is personal preference and it dictates your preferred file sizes. You can follow [TRaSH: Quality settings](https://trash-guides.info/Radarr/Radarr-Quality-Settings-File-Size/) to maximize the quality of the downloaded content and restrict low quality stuff.

Personally, I think TRaSH's quality settings are a bit elitist and first world-y. I'm fine with whatever, and the tracker I'm using has the quality I want anyways. I did, however, set it to a minimum of `0` and maximum of `400` for the qualities shown in TRaSH's guide. Configuring anything below `720p` shouldn't be necessary anyways.

#### Custom Formats

Again, this is also completely a personal preference selection and depends on the quality and filters you want. My custom format selections are mostly based on [TRaSH: HD Bluray + WEB quality profile](https://trash-guides.info/Radarr/radarr-setup-quality-profiles/#hd-bluray-webA).

The only *Unwanted* format that I'm not going to use is the Low Quality ([LQ](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#lq)) as it blocks one of the sources I'm using to download a bunch of movies. The reasoning behind the LQ custom format is that these release groups don't care much about quality (they keep low file sizes) and name tagging, which I understand but I'm fine with this as I can upgrade movies individually whenever I want (I want a big catalog of content that I can quickly watch).

#### Profiles

As mentioned in [Custom Formats](#custom-formats) and [Quality](#quality) this is completly a personal preference. I'm going to go for "Low Quality" downloads by still following some of the conventions from TRaSH. I'm using the [TRaSH: HD Bluray + WEB quality profile](https://trash-guides.info/Radarr/radarr-setup-quality-profiles/#hd-bluray-webA) with the exclusion of the [LQ](https://trash-guides.info/Radarr/Radarr-collection-of-custom-formats/#lq) profile.

I set the name to "HD Bluray + WEB". I'm also not upgrading the torrents for now. Language set to "Original".

#### Indexers

WIP

#### Download Clients

WIP

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
