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

This is taken from [qBitTorrent: Nginx reverse proxy for Web UI](https://github.com/qbittorrent/qBittorrent/wiki/NGINX-Reverse-Proxy-for-Web-UI). Restart the `nginx` service for the changes to take effect:

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

This is taken from [Radarr Nginx reverse proxy configuration](https://wiki.servarr.com/radarr/installation#nginx). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx
```

## Start using Radarr

You can now `start`/`enable` the `radarr.service`:

```sh
systemctl enable radarr.service
systemctl start radarr.service
```

This will start the service and create the default configs under `/var/lib/radarr`. We need to change the `URLBase` as we're running the reverse proxy under a subdirectory (`/radarr`). Edit `/var/lib/radarr/config.xml`:

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

Note that if you want to have an anime movies library, it is recommended to run a second instance of Radarr for this as shown in [Radarr: Linux multiple instances](https://wiki.servarr.com/radarr/installation#linux-multiple-instances) and follow [TRaSH: How to setup quality profiles anime](https://trash-guides.info/Radarr/radarr-setup-quality-profiles-anime/) if an anime instance is what you want.

### Configuration

This is the most tedious part, but I'm going to go for most of the defaults plus recommended configs (by [TRaSH](https://trash-guides.info/)) according to the official [Radarr: Quick start guide](https://wiki.servarr.com/radarr/quick-start-guide). Anything that is either not mentioned in the guide, or that is specific to how I'm setting up stuff in this entry will be stated below.

#### Media Management

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

#### Download clients

Pretty straight forward, just click on the giant "+" button and click on the qBitTorrent option. Then configure:

- Name: can be anything, just an identifier.
- Enable: enable it.
- Host: use `localhost`. For some reason I can't make it work with the reverse proxied qBitTorrent.
- Port: the port number you chose, `30000` in my case.
- Url Base: leave blank as even though we have it exposed under `/qbt`, the `localhost` service itself is not.
- Username: the Web UI username, `admin` by default.
- Password: the Web UI username, `adminadmin` by default (you should've changed it if you have the service exposed).
- Category: `movies`. Not sure if this can be set on a per indexer basis, but for now I'm using it like this. If I need another category I think I'll have to "add another download client" (which would be the same just with different category).

Everything else can be left as default, but maybe change *Completed Download Handling* if you'd like. Same goes for the general *Failed Download Handling* download clients' option.

#### Indexers

Also easy to set up, also just click on the giant "+" button and click on the *custom* Torznab option (you can also use the *preset -> Jackett* Torznab option). Then configure:

- Name: can be anything, just an identifier. I like to do "Jackett - indexer_name".
- URL: `http://localhost:9117/api/v2.0/indexers/YOURINDEXER/results/torznab/`, where `YOURINDEXER` is what Jackett exposes. Can be looked at if you hover on the indexer's "Copy Torznab Feed" button on the Jackett Web UI, examples are `yts` and `thepiratebay`. Again, for some reason I can't directly use the reverse proxied Jackett.
- API Path: `/api`, leave as is.
- API Key: this can be found at the top right corner in Jackett's Web UI. Copy/paste it.
- Categories: which categories to use when searching, these are generic categories until you test/add the indexer. After you add the indexer you can come back and select your prefered categories (like just toggling the movies categories).
- Tags: I like to add a tag for the "indexer_name" like `yts` or `tpb`. This is useful so I can control which indexers to use when adding new movies.

Everything else on default. *Download Client* can also be set, which can be useful to keep different categories per indexer or something similar. *Seed Ratio* and *Seed Time* can also be set and are used to manage when to stop the torrent, this can also be set globally on the qBitTorrent Web UI, this is a personal setting.

### Download content

You can now start to download content by going to *Movies -> Add New*. Basically just follow the [Radarr: How to add a movie](https://wiki.servarr.com/radarr/quick-start-guide#how-to-add-a-movie) guide. The screenshots from the guide are a bit outdated but it contains everything you need to know.

I personally use:

- Monitor: Movie Only.
- Minimum Availability: Released.
- Quiality Profile: "HD Bluray + WEB", the one configured in this entry.
- Tags: the "indexer_name" I want to use to download the movie, usually just `yts` (remember this is a "LQ" so if you have that custom format set it might not download anything) as mentioned in [Indexers](#indexers-1). If you don't specify a tag it will use all indexers as far as I know.
- Start search for missing movie: toggled on. Immediatly start searching for the movie and start the download.

Once you click on "Add Movie" it will add it to the *Movies* section and start searching and selecting the best torrent it finds, according to the "filters" (quality settings, profile and indexer(s)).

When it selects a torrent it sends it to qBitTorrent and you can even go ahead and monitor it over there. Else you can also monitor at *Activity -> Queue*.

After the movie is downloaded and processed by Radarr, it will create the appropriate hardlinks to the `media/movies` directory, as set in [Directory structure](#directory-structure).

# Sonarr

[Sonarr](https://sonarr.tv/) is a TV series collection manager that can be used to download series via torrents. As mentioned in [Radarr](#radarr). Most of the install process, configuration and whatnot is going to be basically the same as with [Radarr](#radarr).

Install from the AUR with `yay`:

```sh
yay -S sonarr
```

==Add the `sonarr` user to the `servarr` group:==

```sh
gpasswd -a sonarr servarr
```

The default port that Sonarr uses is `8989` for http, this should be fine for you, but I'll change it to `7979` as it's already in use for Komga for me, as shown in my [Manga server with Komga](https://blog.luevano.xyz/a/manga_server_with_komga.html).

## Reverse proxy

Basically the same as with [Radarr: Reverse proxy](#reverse-proxy-2), ==except that the `proxy_pass` (needs `/sonarr`) and the `proxy_set_header` (needs `$proxy_host` instead of `$host`) are different.==

Add the following `location` blocks into the `isos.conf`, I'll leave it as `sonarr`:

```nginx
location /sonarr {
    proxy_pass http://localhost:7979/sonarr; # change port if needed, this is not the default
    proxy_http_version 1.1;

    proxy_set_header Host $proxy_host; # this differs from the radarr reverse proxy
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;

    proxy_redirect off;
}
# Allow the API External Access via NGINX
location /sonarr/api {
    auth_basic off;
    proxy_pass http://localhost:7979; # change port if needed, this is not the default
}
```

This is taken from [Sonarr: Nginx reverse proxy configuration](https://wiki.servarr.com/sonarr/installation#nginx). Restart the `nginx` service for the changes to take effect:

```sh
systemctl restart nginx
```

## Start using Sonarr

You can now `start`/`enable` the `sonarr.service`:

```sh
systemctl enable sonarr.service
systemctl start sonarr.service
```

This will start the service and create the default configs under `/var/lib/sonarr`. We need to change the `URLBase` as we're running the reverse proxy under a subdirectory (`/sonarr`) and in my case the `Port`. Edit `/var/lib/sonarr/config.xml`:

```xml
...
<Port>7979</Port>
<UrlBase>/sonarr</UrlBase>
...
```

Then restart the `sonarr` service:

```sh
systemctl restart sonarr.service
```

Now `https://isos.yourdomain.com/sonarr` is accessible. Again go straight to secure the instance by adding authentication under *Settings -> General -> Security*. I added the "Forms" option, just fill in the username and password then click on save changes on the top left of the page. You can restart the service again and check that it asks for login credentials.

Similar to [Radarr](#radarr) if you want to have an anime library, it is recommended to run a second instance of Sonarr for this as shown in [Sonarr: Linux multiple instances](https://wiki.servarr.com/sonarr/installation#linux-multiple-instances) and follow [TRaSH: Release profile regex (anime)](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx-Anime/) and the [TRaSH: Anime recommended naming scheme](https://trash-guides.info/Sonarr/Sonarr-recommended-naming-scheme/#anime-episode-format) if an anime instance is what you want.

### Configuration

Also the most tedious part, will go for most of the defaults plus recommended configs (by [TRaSH](https://trash-guides.info/)) according to the official [Sonarr: Quick start guide](https://wiki.servarr.com/sonarr/quick-start-guide), as with [Radarr](#radarr). Anything that is either not mentioned in the guide, or that is specific to how I'm setting up stuff in this entry will be stated below.

#### Media Management

- **File Management**:
    - *Propers and Repacks*: set it to "Do Not Prefer" and instead we'll use the [Propers and Repacks](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/#propers-and-repacks) release profile and fill with [P2P Groups + Repack/Proper](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/#p2p-groups-repackproper).

#### Quality

Similar to [Radarr: Quality](#quality) this is personal preference and it dictates your preferred file sizes. You can follow [TRaSH: Quality settings](https://trash-guides.info/Sonarr/Sonarr-Quality-Settings-File-Size/) to maximize the quality of the downloaded content and restrict low quality stuff.

Will basically do the same as in [Radarr: Quality](#quality): set minimum of `0` and maximum of `400` for everything `720p` and above.

#### Profiles

This is a bit different than with [Radarr](#radarr), the way it is configured is by setting "Release profiles". I took the profiles from [TRaSH: WEB-DL Release profile regex](https://trash-guides.info/Sonarr/Sonarr-Release-Profile-RegEx/). The only possible change I'll do is disable the Low Quality Groups after some testing if this results in some issues, similar with Radarr's "LQ" custom format.

For me it ended up looking like this:

![Sonarr: Release profiles](${SURL}/images/b/sonarr/sonarr_release_profiles.png "Sonarr: Release profiles")

But yours can differ as is mostly personal preference. For the "Quality profile" I'll be using the default "HD-1080p" most of the time, but I also created a "WEB(720/1080/2160)" because some shows are not present in only one quality.

#### Download clients

Exactly the same as with [Radarr: Download clients](#download-clients) only change is the category from `movies` to `tv` (or whatever you want), click on the giant "+" button and click on the qBitTorrent option. Then configure:

- Name: can be anything, just an identifier.
- Enable: enable it.
- Host: use `localhost`.
- Port: the port number you chose, `30000` in my case.
- Url Base: leave blank as even though we have it exposed under `/qbt`, the `localhost` service itself is not.
- Username: the Web UI username, `admin` by default.
- Password: the Web UI username, `adminadmin` by default (you should've changed it if you have the service exposed).
- Category: `tv`.

Everything else can be left as default, but maybe change *Completed Download Handling* if you'd like. Same goes for the general *Failed Download Handling* download clients' option.

#### Indexers

Also exactly the same as with [Radarr: Indexers](#indexers-1), click on the giant "+" button and click on the *custom* Torznab option (this doesn't have the Jackett preset). Then configure:

- Name: can be anything, just an identifier. I like to do "Jackett - indexer_name".
- URL: `http://localhost:9117/api/v2.0/indexers/YOURINDEXER/results/torznab/`, where `YOURINDEXER` is what Jackett exposes. Can be looked at if you hover on the indexer's "Copy Torznab Feed" button on the Jackett Web UI, examples are `eztv` and `thepiratebay`. Again, for some reason I can't directly use the reverse proxied Jackett.
- API Path: `/api`, leave as is.
- API Key: this can be found at the top right corner in Jackett's Web UI. Copy/paste it.
- Categories: which categories to use when searching, these are generic categories until you test/add the indexer. After you add the indexer you can come back and select your prefered categories (like just toggling the movies categories).
- Tags: I like to add a tag for the "indexer_name" like `yts` or `tpb`. This is useful so I can control which indexers to use when adding new movies.

Everything else on default. *Download Client* can also be set, which can be useful to keep different categories per indexer or something similar. *Seed Ratio* and *Seed Time* can also be set and are used to manage when to stop the torrent, this can also be set globally on the qBitTorrent Web UI, this is a personal setting.

### Download content

Almost the same as with [Radarr: Download content](#download-content), but I've been personally selecting the torrents I want to download for each season/episode so far, as the indexers I'm using are all over the place and I like consistencies. Will update if I find a better near 100% automation process, but I'm fine with this anyways as I always monitor that everything is going fine.

Add by going to *Series -> Add New*. Basically just follow the [Sonarr: Library add new](https://wiki.servarr.com/sonarr/library#add-new) guide. Adding series needs a bit more options that movies in Radarr, but it's straight forward.

I personally use:

- Monitor: All Episodes.
- Quiality Profile: "WEB(720/1080/2160)". This depends on what I want for that how, lately I've been experimenting with this one.
- Series Type: Standard. For now I'm just downloading shows, but it has an Anime option.
- Tags: the "indexer_name" I want to use to download the movie, I've been using all indexers so I just use all tags as I'm experimenting and trying multiple options.
- Season Folder: enabled. I like as much organization as possible.
- Start search for missing episodes: disabled. Depends on you, due to my indexers, I prefer to check manually the season packs, for example.
- Start search for cutoff unmet episodes: disabled. Honestly don't really know what this is.

Once you click on "Add X" it will add it to the *Series* section and will start as monitored. So far I haven't noticed that it immediately starts downloading (because of the "Start search for missing episodes" setting) but I always click on unmonitor the series, so I can manually check (again, due to the low quality of my indexers).

When it automatically starts to download an episode/season it will send it to qBitTorrent and you can monitor it over there. Else you can also monitor at *Activity -> Queue*. Same thing goes if you download manually each episode/season via the interactive search.

To interactively search episodes/seasons go to *Series* and then click on any series, then click either on the interactive search button for the episode or the season, it is an icon of a person as shown below:

![Sonarr: Interactive search button](${SURL}/images/b/sonarr/sonarr_interactive_search_button.png "Sonarr: Interactive search button")

Then it will bring a window with the search results, where it shows the indexer it got the result from, the size of the torrent, peers, language, quality, the score it received from the configured release profiles an alert in case that the torrent is "bad" and the download button to manually download the torrent you want. An example shown below:

![Sonarr: Interactive search results](${SURL}/images/b/sonarr/sonarr_interactive_search_results.png "Sonarr: Interactive search results")

After the movie is downloaded and processed by Sonarr, it will create the appropriate hardlinks to the `media/tv` directory, as set in [Directory structure](#directory-structure).

# Jellyfin

[Jellyfin](https://wiki.archlinux.org/title/Jellyfin) is a media server "manager", usually used to manage and organize video content (movies, TV series, etc.) which could be compared with [Plex](https://wiki.archlinux.org/title/plex) or [Emby](https://wiki.archlinux.org/title/Emby) for example (take them as possible alternatives).

Install from the AUR with `yay`:

```sh
yay -S jellyfin-bin
```

I'm installing the pre-built binary instead of building it as I was getting a lot of errors and the server was even crashing. You can try installing `jellyfin` instead.

==Add the `jellyfin` user to the `servarr` group:==

```sh
gpasswd -a jellyfin servarr
```

You can already `start`/`enable` the `jellyfin.service` which will start at `http://localhost:8096/` by default where you need to complete the initial set up. But let's create the reverse proxy first then start everything and finish the set up.

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

Similarly to the `isos` subdomain, that will autodetect the new subdomain and extend the existing certificate(s). Restart the `nginx` service for changes to take effect:

```sh
systemctl restart nginx
```

## Start using Jellyfin

You can now `start`/`enable` the `jellyfin.service` if you haven't already:

```sh
systemctl enable jellyfin.service
systemctl start jellyfin.service
```

Then navigate to `https://jellyfin.yourdomain.com` and either continue with the set up wizard if you didn't already or continue with the next steps to configure your libraries.

The initial setup wizard makes you create an user (will be the admin for now) and at least one library, though these can be done later. For more check [Jellyfin: Quick start](https://jellyfin.org/docs/general/quick-start/).

Remember to use the configured directory as mentioned in [Directory structure](#directory-structure). Any other configuration (like adding users or libraries) can be done at the dashboard: click on the 3 horizontal lines on the top left of the Web UI then click on *Administration -> Dashboard*. I didn't configure much other than adding a couple of users for me and friends, I wouldn't recommend using the admin account to watch (personal preference).

Once there is at least one library it will show at *Home* along with the latest movies (if any) similar to the following (don't judge, these are just the latest I added due to friend's requests):

![Jellyfin: Home libraries](${SURL}/images/b/jellyfin/jellyfin_home_libraries.png "Jellyfin: Home libraries")

And inside the "Movies" library you can see the whole catalog where you can filter or just scroll as well as seeing *Suggestions* (I think this starts getting populated afte a while) and *Genres*:

![Jellyfin: Library catalog options](${SURL}/images/b/jellyfin/jellyfin_library_catalog_options.png "Jellyfin: Library catalog options")
